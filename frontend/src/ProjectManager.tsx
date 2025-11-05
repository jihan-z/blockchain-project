import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI } from './blockchain';

interface ProjectInfo {
  id: number; // 添加项目ID
  name: string;
  options: string[];
  endTime: number;
  totalPool: string;
  finished: boolean;
  winningOption: number;
  creator: string;
  useToken: boolean;
}

interface ProjectManagerProps {
  wallet: string | null;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({ wallet }) => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [winningOption, setWinningOption] = useState<{[key: number]: number}>({});

  useEffect(() => {
    if (wallet) {
      fetchProjects();
    }
  }, [wallet]);

  const fetchProjects = async () => {
    if (!wallet) return;
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      
      const projectCount = await contract.getProjectCount();
      const projectsData: ProjectInfo[] = [];
      
      for (let i = 0; i < projectCount; i++) {
        // 使用 getProject 方法获取完整的项目信息（包括 options 数组）
        const project = await contract.getProject(i);
        projectsData.push({
          id: i, // 保存真实的项目ID
          name: project[0],
          options: project[1],
          endTime: Number(project[2]),
          totalPool: ethers.formatEther(project[3]),
          finished: project[4],
          winningOption: Number(project[5]),
          creator: project[6],
          useToken: project[7]
        });
      }
      
      setProjects(projectsData);
      setLoading(false);
    } catch (error) {
      console.error('加载项目失败:', error);
      setLoading(false);
    }
  };

  const handleSetResult = async (project: ProjectInfo) => {
    if (!wallet) {
      alert('请先连接钱包');
      return;
    }
    
    const projectId = project.id;
    const optionId = winningOption[projectId];
    
    if (optionId === undefined) {
      alert('请选择获胜选项');
      return;
    }
    
    // 检查项目是否到了截止时间
    const now = Date.now() / 1000;
    if (now < project.endTime) {
      const endTimeStr = new Date(project.endTime * 1000).toLocaleString();
      alert(`项目还未到截止时间！\n截止时间: ${endTimeStr}\n\n如需立即结束，请使用"提前结束"按钮`);
      return;
    }
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      
      console.log('设置结果:', { projectId, optionId, creator: project.creator, wallet });
      
      const tx = await contract.setResult(projectId, optionId);
      await tx.wait();
      
      alert('结果设置成功！');
      fetchProjects();
    } catch (error: any) {
      console.error('设置结果失败:', error);
      
      let errorMsg = '未知错误';
      if (error.code === 'CALL_EXCEPTION') {
        errorMsg = '设置失败，可能原因：\n';
        errorMsg += '1. 不是项目创建者\n';
        errorMsg += '2. 项目已结束\n';
        errorMsg += '3. 还未到截止时间（请用"提前结束"）';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`设置结果失败:\n${errorMsg}`);
    }
  };

  const handleEndProject = async (project: ProjectInfo) => {
    if (!wallet) {
      alert('请先连接钱包');
      return;
    }
    
    const projectId = project.id;
    const optionId = winningOption[projectId];
    
    // 检查是否选择了获胜选项
    if (optionId === undefined) {
      alert('请先选择获胜选项');
      return;
    }
    
    // 检查项目是否已经到了截止时间
    const now = Date.now() / 1000;
    if (now >= project.endTime) {
      alert('项目已到截止时间，请直接使用"设置结果"按钮');
      return;
    }
    
    const selectedOptionName = project.options[optionId];
    if (!window.confirm(`确定要提前结束这个项目吗？\n获胜选项：${selectedOptionName}`)) {
      return;
    }
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      
      console.log('提前结束项目:', { projectId, optionId, creator: project.creator, wallet });
      
      const tx = await contract.endProject(projectId, optionId);
      await tx.wait();
      
      alert(`项目已提前结束！\n获胜选项：${selectedOptionName}`);
      fetchProjects();
    } catch (error: any) {
      console.error('结束项目失败:', error);
      
      let errorMsg = '未知错误';
      if (error.code === 'CALL_EXCEPTION') {
        errorMsg = '结束失败，可能原因：\n';
        errorMsg += '1. 不是项目创建者\n';
        errorMsg += '2. 项目已经结束\n';
        errorMsg += '3. 项目已到截止时间（请用"设置结果"）\n';
        errorMsg += '4. 未选择获胜选项';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`结束项目失败:\n${errorMsg}`);
    }
  };

  const isCreator = (project: ProjectInfo) => {
    return wallet && project.creator.toLowerCase() === wallet.toLowerCase();
  };

  if (!wallet) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>请先连接钱包</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>加载中...</p>
      </div>
    );
  }

  const myProjects = projects.filter((project, index) => isCreator(project));

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: 0, color: '#00ff88' }}>项目管理</h2>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.9rem', color: '#888' }}>我的项目数:</span>
          <span style={{ 
            background: 'linear-gradient(45deg, #00ff88, #00ccff)', 
            color: '#000', 
            padding: '0.25rem 0.75rem', 
            borderRadius: '20px', 
            fontWeight: '600',
            fontSize: '0.8rem'
          }}>
            {myProjects.length}
          </span>
        </div>
      </div>
      
      {myProjects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <h3>暂无管理权限</h3>
          <p>您还没有创建任何项目，或者您不是任何项目的创建者</p>
        </div>
      ) : (
        <div className="project-grid">
          {myProjects.map((project, index) => (
            <div key={index} className="project-card">
              <div className="project-header">
                <h3 className="project-title">{project.name}</h3>
                <span className={`project-status ${project.finished ? 'status-finished' : 'status-active'}`}>
                  {project.finished ? '已结束' : '进行中'}
                </span>
              </div>
              
              <div className="project-details">
                <div className="project-detail">
                  <span className="label">奖池总额:</span>
                  <span className="value">{project.totalPool} {project.useToken ? '代币' : 'ETH'}</span>
                </div>
                <div className="project-detail">
                  <span className="label">截止时间:</span>
                  <span className="value">{new Date(project.endTime * 1000).toLocaleString()}</span>
                </div>
                <div className="project-detail">
                  <span className="label">状态:</span>
                  <span className="value">
                    {project.finished ? `已开奖，胜方：${project.options && project.options[project.winningOption] ? project.options[project.winningOption] : '未知'}` : "进行中"}
                  </span>
                </div>
                
                {!project.finished && (
                  <div className="project-actions">
                    <div className="form-group">
                      <label>设置获胜选项</label>
                      <div className="options-list">
                        {project.options && project.options.map ? project.options.map((option, optionIdx) => (
                          <div key={optionIdx} className="option-item">
                            <input
                              type="radio"
                              name={`project-${project.id}`}
                              value={optionIdx}
                              checked={winningOption[project.id] === optionIdx}
                              onChange={() => setWinningOption(prev => ({ ...prev, [project.id]: optionIdx }))}
                            />
                            <span>{option}</span>
                          </div>
                        )) : (
                          <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>选项数据加载失败</div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleSetResult(project)}
                        disabled={winningOption[project.id] === undefined}
                      >
                        🏆 设置结果
                      </button>
                      
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleEndProject(project)}
                        disabled={winningOption[project.id] === undefined}
                      >
                        ⏹️ 提前结束
                      </button>
                    </div>
                  </div>
                )}
                
                {project.finished && (
                  <div className="project-actions">
                    <div style={{ 
                      background: 'rgba(0, 255, 136, 0.1)', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      border: '1px solid #00ff88'
                    }}>
                      <h4 style={{ color: '#00ff88', margin: '0 0 0.5rem 0' }}>项目已结束</h4>
                      <p style={{ margin: 0, color: '#fff' }}>
                        获胜选项: <strong>{project.options && project.options[project.winningOption] ? project.options[project.winningOption] : '未知'}</strong>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectManager;