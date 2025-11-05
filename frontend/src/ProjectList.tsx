import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  LOTTERY_MANAGER_ADDRESS,
  LOTTERY_MANAGER_ABI,
  LOTTERY_TOKEN_ADDRESS,
  LOTTERY_TOKEN_ABI
} from "./blockchain";

interface ProjectInfo {
  name: string;
  options: string[];
  endTime: number;
  totalPool: string;
  finished: boolean;
  winningOption: number;
  creator: string;
  useToken: boolean;
}

const ProjectList: React.FC<{ wallet: string | null }> = ({ wallet }) => {
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOption, setSelectedOption] = useState<{[key: number]: number}>({});
  const [buyAmount, setBuyAmount] = useState<{[key: number]: string}>({});
  // 购买支付方式严格以链上项目 useToken 为准，不再允许前端切换
  
  // 创建项目相关的状态
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    options: ['', ''],
    endTime: '',
    poolAmount: '',
    useToken: false
  });

  useEffect(() => {
    // 只有在钱包连接或组件挂载时才获取项目
    if (wallet) {
      fetchProjects();
    } else {
      setProjects([]);
      setLoading(false);
    }
    // eslint-disable-next-line
  }, [wallet]); // 添加wallet依赖，当钱包连接状态改变时重新加载

  const fetchProjects = async () => {
    setLoading(true);
    try {
      // 检查是否有以太坊提供者
      if (!(window as any).ethereum) {
        console.log('未检测到以太坊钱包');
        setProjects([]);
        return;
      }
      
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const contract = new ethers.Contract(
        LOTTERY_MANAGER_ADDRESS,
        LOTTERY_MANAGER_ABI,
        provider
      );
      const count = await contract.getProjectCount();
      const arr: ProjectInfo[] = [];
      for (let i = 0; i < count; i++) {
        const p = await contract.getProject(i);
        arr.push({
          name: p[0],
          options: p[1],
          endTime: Number(p[2]),
          totalPool: ethers.formatEther(p[3]),
          finished: p[4],
          winningOption: Number(p[5]),
          creator: p[6],
          useToken: p[7]
        });
      }
      setProjects(arr);
    } catch (e) {
      console.error('获取项目失败:', e);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimPrize = async (projectId: number) => {
    if (!wallet) return alert('请先连接钱包');
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      
      const tx = await contract.claimPrize(projectId);
      await tx.wait();
      alert('领奖成功');
      window.location.reload();
    } catch (e) {
      alert('领奖失败');
    }
  };

  const handleOptionChange = (projectId: number, optionId: number) => {
    setSelectedOption(prev => ({ ...prev, [projectId]: optionId }));
  };

  const handleAmountChange = (projectId: number, amount: string) => {
    setBuyAmount(prev => ({ ...prev, [projectId]: amount }));
  };

  // 已废弃：支付方式随项目而定

  const handleBuyTicket = async (projectId: number) => {
    if (!wallet) return alert('请先连接钱包');
    
    const optionId = selectedOption[projectId];
    const amount = buyAmount[projectId];
    const project = projects[projectId];
    
    if (!project) {
      return alert('项目不存在，请刷新页面');
    }
    
    if (optionId === undefined) return alert('请选择一个选项');
    if (!amount || parseFloat(amount) <= 0) return alert('请输入有效的金额');
    
    // 检查项目是否已结束
    if (project.finished) {
      return alert('项目已结束，无法购买彩票');
    }
    
    // 检查项目是否已过期
    if (Date.now() / 1000 > project.endTime) {
      return alert('项目已过期，无法购买彩票');
    }
    
    const useTokenPayment = project.useToken;
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      
      console.log('购买彩票参数:', {
        projectId,
        optionId,
        amount,
        useTokenPayment,
        projectFinished: project.finished,
        projectEndTime: new Date(project.endTime * 1000).toLocaleString()
      });
      
      if (useTokenPayment) {
        // 使用代币支付
        const tokenContract = new ethers.Contract(LOTTERY_TOKEN_ADDRESS, LOTTERY_TOKEN_ABI, signer);
        
        // 检查代币余额
        const balance = await tokenContract.balanceOf(wallet);
        const requiredAmount = ethers.parseEther(amount);
        console.log('代币余额:', ethers.formatEther(balance), 'LTK, 需要:', amount, 'LTK');
        
        if (balance < requiredAmount) {
          return alert('代币余额不足，请先领取测试代币');
        }
        
        // 批准代币转账
        console.log('授权代币转账...');
        const approveTx = await tokenContract.approve(LOTTERY_MANAGER_ADDRESS, requiredAmount);
        await approveTx.wait();
        console.log('代币授权成功');
        
        // 购买彩票
        console.log('购买彩票（代币）...');
        const tx = await contract.buyTicket(projectId, optionId, requiredAmount);
        console.log('交易已提交:', tx.hash);
        await tx.wait();
        console.log('交易已确认');
      } else {
        // 使用ETH支付
        const amountWei = ethers.parseEther(amount);
        
        // 检查 ETH 余额
        const ethBalance = await provider.getBalance(wallet);
        console.log('ETH 余额:', ethers.formatEther(ethBalance), 'ETH, 需要:', amount, 'ETH');
        
        if (ethBalance < amountWei) {
          return alert('ETH 余额不足');
        }
        
        console.log('购买彩票（ETH）...');
        const tx = await contract.buyTicket(projectId, optionId, amountWei, {
          value: amountWei
        });
        console.log('交易已提交:', tx.hash);
        await tx.wait();
        console.log('交易已确认');
      }
      
      alert('购买成功');
      window.location.reload();
    } catch (e: any) {
      console.error('购买失败 - 完整错误:', e);
      
      // 提取更详细的错误信息
      let errorMessage = '未知错误';
      
      if (e.code === 'CALL_EXCEPTION') {
        errorMessage = '合约调用失败，可能的原因：\n';
        errorMessage += '1. 合约地址不正确（请检查是否重新部署后更新了地址）\n';
        errorMessage += '2. 项目已结束或不存在\n';
        errorMessage += '3. 选项ID无效\n';
        errorMessage += '4. 余额不足';
      } else if (e.reason) {
        errorMessage = e.reason;
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      alert(`购买失败:\n${errorMessage}`);
    }
  };

  const handleClaimToken = async () => {
    if (!wallet) return alert('请先连接钱包');
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_TOKEN_ADDRESS, LOTTERY_TOKEN_ABI, signer);
      
      const tx = await contract.claim();
      await tx.wait();
      alert('领取代币成功');
    } catch (e) {
      alert('领取代币失败');
    }
  };

  const handleRequestTestETH = async () => {
    if (!wallet) return alert('请先连接钱包');
    
    try {
      // 通过本地开发链的调试 RPC 方法直接为账户设置余额（仅限本地/测试环境）
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await browserProvider.getSigner();
      const userAddress = await signer.getAddress();
      
      // 直连本地 RPC（Hardhat/Ganache/Anvil 常见端口 8545）
      const rpc = new ethers.JsonRpcProvider('http://localhost:8545');
      const targetBalance = ethers.parseEther('100'); // 目标余额 100 ETH
      const targetHex = '0x' + targetBalance.toString(16);
      
      let ok = false;
      // 依次尝试不同开发链的设置余额方法
      try {
        await rpc.send('hardhat_setBalance', [userAddress, targetHex]);
        ok = true;
        console.log('使用 hardhat_setBalance 设置余额成功');
      } catch (_) {}
      if (!ok) {
        try {
          await rpc.send('anvil_setBalance', [userAddress, targetHex]);
          ok = true;
          console.log('使用 anvil_setBalance 设置余额成功');
        } catch (_) {}
      }
      if (!ok) {
        try {
          await rpc.send('evm_setAccountBalance', [userAddress, targetHex]);
          ok = true;
          console.log('使用 evm_setAccountBalance 设置余额成功');
        } catch (_) {}
      }
      
      if (!ok) {
        return alert('未能调用本地开发链的余额设置方法，请确认正在使用 Hardhat/Anvil/Ganache 本地网络，并启用 http://localhost:8545');
      }
      
      // 读取最新余额反馈给用户
      const newBalance = await browserProvider.getBalance(userAddress);
      alert(`测试 ETH 已到账，当前余额：${ethers.formatEther(newBalance)} ETH`);
    } catch (e) {
      console.error('请求测试 ETH 失败:', e);
      alert('请求测试 ETH 失败，请确认已连接到本地开发网络且已开启 8545 端口');
    }
  };

  // 创建项目相关函数
  const handleCreateProject = async () => {
    if (!wallet) return alert('请先连接钱包');
    
    if (!newProject.name || newProject.options.some(opt => !opt) || !newProject.endTime || !newProject.poolAmount) {
      return alert('请填写所有字段');
    }
    
    if (newProject.options.length < 2) {
      return alert('至少需要两个选项');
    }
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      
      const endTime = Math.floor(new Date(newProject.endTime).getTime() / 1000);
      
      const poolAmountWei = ethers.parseEther(newProject.poolAmount);
      
      if (newProject.useToken) {
        // 使用代币支付奖池
        const tokenContract = new ethers.Contract(LOTTERY_TOKEN_ADDRESS, LOTTERY_TOKEN_ABI, signer);
        
        // 检查代币余额
        const balance = await tokenContract.balanceOf(wallet);
        console.log('代币余额:', ethers.formatEther(balance), 'LTK, 需要:', newProject.poolAmount, 'LTK');
        
        if (balance < poolAmountWei) {
          return alert('代币余额不足，请先领取测试代币');
        }
        
        // 批准代币转账
        console.log('授权代币转账...');
        const approveTx = await tokenContract.approve(LOTTERY_MANAGER_ADDRESS, poolAmountWei);
        await approveTx.wait();
        console.log('代币授权成功');
        
        // 创建项目（传入代币金额）
        console.log('创建项目（代币）...');
        const tx = await contract.createProject(
          newProject.name,
          newProject.options,
          endTime,
          newProject.useToken,
          poolAmountWei
        );
        await tx.wait();
      } else {
        // 使用ETH支付奖池
        console.log('创建项目（ETH）...');
        const tx = await contract.createProject(
          newProject.name,
          newProject.options,
          endTime,
          newProject.useToken,
          0, // tokenAmount = 0
          {
            value: poolAmountWei
          }
        );
        await tx.wait();
      }
      
      alert('项目创建成功！奖池金额已从您的账户扣除');
      setShowCreateForm(false);
      setNewProject({
        name: '',
        options: ['', ''],
        endTime: '',
        poolAmount: '',
        useToken: false
      });
      fetchProjects(); // 重新加载项目列表
    } catch (e: any) {
      console.error('项目创建失败:', e);
      
      let errorMsg = '项目创建失败';
      if (e.reason) {
        errorMsg = e.reason;
      } else if (e.message) {
        errorMsg = e.message;
      } else if (e.code === 'CALL_EXCEPTION') {
        errorMsg = '创建失败，可能原因：\n1. 余额不足\n2. 未授权代币转账\n3. 截止时间设置错误';
      }
      
      alert(errorMsg);
    }
  };

  const addOption = () => {
    setNewProject(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index: number) => {
    if (newProject.options.length <= 2) {
      alert('至少需要两个选项');
      return;
    }
    
    setNewProject(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const updateOption = (index: number, value: string) => {
    setNewProject(prev => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return {
        ...prev,
        options: newOptions
      };
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={handleRequestTestETH}>
          💰 获取测试 ETH
        </button>
        <button className="btn btn-secondary" onClick={handleClaimToken}>
          🪙 领取测试代币
        </button>
        <button 
          className={`btn ${showCreateForm ? 'btn-danger' : 'btn-success'}`}
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '❌ 取消创建' : '🚀 创建竞猜项目'}
        </button>
      </div>
      
      {/* 项目统计摘要 */}
      {!loading && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {(() => {
            const total = projects.length;
            const finishedCount = projects.filter(p => p.finished).length;
            const activeCount = total - finishedCount;
            return (
              <>
                <div className="project-card" style={{ padding: '0.75rem 1rem' }}>
                  <strong>项目总数:</strong> {total}
                </div>
                <div className="project-card" style={{ padding: '0.75rem 1rem' }}>
                  <strong>进行中:</strong> {activeCount}
                </div>
                <div className="project-card" style={{ padding: '0.75rem 1rem' }}>
                  <strong>已结束:</strong> {finishedCount}
                </div>
              </>
            );
          })()}
        </div>
      )}
      
      {showCreateForm && (
        <div className="project-card" style={{ marginBottom: '2rem' }}>
          <h3 className="project-title">创建新的竞猜项目</h3>
          <div className="form-group">
            <label>项目名称</label>
            <input
              type="text"
              className="form-control"
              value={newProject.name}
              onChange={(e) => setNewProject({...newProject, name: e.target.value})}
              placeholder="例如：NBA MVP竞猜"
            />
          </div>
          
          <div className="form-group">
            <label>选项</label>
            {newProject.options.map((option, index) => (
              <div key={index} className="option-input-group">
                <input
                  type="text"
                  className="form-control"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`选项 ${index + 1}`}
                />
                {newProject.options.length > 2 && (
                  <button 
                    className="btn btn-danger btn-sm"
                    onClick={() => removeOption(index)}
                  >
                    -
                  </button>
                )}
              </div>
            ))}
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={addOption}
              style={{ marginTop: '0.5rem' }}
            >
              + 添加选项
            </button>
          </div>
          
          <div className="form-group">
            <label>截止时间</label>
            <input
              type="datetime-local"
              className="form-control"
              value={newProject.endTime}
              onChange={(e) => setNewProject({...newProject, endTime: e.target.value})}
              min={new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16)}
              required
            />
            <small style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
              请选择未来的时间作为竞猜截止时间
            </small>
          </div>
          
          <div className="form-group">
            <label>奖池金额</label>
            <input
              type="number"
              className="form-control"
              value={newProject.poolAmount}
              onChange={(e) => setNewProject({...newProject, poolAmount: e.target.value})}
              placeholder="例如：1"
              min="0.001"
              step="0.001"
            />
            <div className="checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={newProject.useToken}
                  onChange={(e) => setNewProject({...newProject, useToken: e.target.checked})}
                />
                使用代币支付
              </label>
            </div>
          </div>
          
          <button 
            className="btn btn-primary"
            onClick={handleCreateProject}
          >
            🚀 创建项目
          </button>
        </div>
      )}
      
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <p>加载中...</p>
        </div>
      )}
      
      {!loading && projects.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <h3>暂无竞猜项目</h3>
          <p>点击上方按钮创建第一个项目</p>
        </div>
      )}
      
      {!loading && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((p, idx) => (
            <div key={idx} className="project-card">
              <div className="project-header">
                <h3 className="project-title">{p.name}</h3>
                <span className={`project-status ${p.finished ? 'status-finished' : 'status-active'}`}>
                  {p.finished ? '已结束' : '进行中'}
                </span>
              </div>
              
              <div className="project-details">
                <div className="project-detail">
                  <span className="label">奖池总额:</span>
                  <span className="value">{p.totalPool} {p.useToken ? '代币' : 'ETH'}</span>
                </div>
                <div className="project-detail">
                  <span className="label">截止时间:</span>
                  <span className="value">{new Date(p.endTime * 1000).toLocaleString()}</span>
                </div>
                <div className="project-detail">
                  <span className="label">状态:</span>
                  <span className="value">
                    {p.finished ? `已开奖，胜方：${p.options[p.winningOption]}` : "进行中"}
                  </span>
                </div>
                
                {!p.finished && wallet && (
                  <div className="project-actions">
                    <div className="form-group">
                      <label>选择选项</label>
                      <div className="options-list">
                        {p.options.map((option, optionIdx) => (
                          <div key={optionIdx} className="option-item">
                            <input
                              type="radio"
                              name={`project-${idx}`}
                              value={optionIdx}
                              checked={selectedOption[idx] === optionIdx}
                              onChange={() => handleOptionChange(idx, optionIdx)}
                            />
                            <span>{option}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>购买金额 ({p.useToken ? '代币' : 'ETH'})</label>
                      <input
                        type="number"
                        className="form-control"
                        placeholder={`0.01`}
                        value={buyAmount[idx] || ''}
                        onChange={(e) => handleAmountChange(idx, e.target.value)}
                        min="0.001"
                        step="0.001"
                      />
                    </div>
                    
                    <div className="checkbox-group">
                      <label>
                        <input
                          type="checkbox"
                          checked={p.useToken}
                          readOnly
                          disabled
                        />
                        使用代币支付（由项目设定）
                      </label>
                    </div>
                    
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleBuyTicket(idx)}
                    >
                      🎫 购买彩票
                    </button>
                  </div>
                )}
                
                {p.finished && wallet && (
                  <div className="project-actions">
                    <div style={{ 
                      background: 'rgba(0, 255, 136, 0.1)', 
                      padding: '1rem', 
                      borderRadius: '8px',
                      border: '1px solid #00ff88',
                      marginBottom: '1rem'
                    }}>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#00ff88', fontWeight: 'bold' }}>
                        🏆 项目已结束
                      </p>
                      <p style={{ margin: 0, color: '#fff' }}>
                        获胜选项: <strong>{p.options[p.winningOption]}</strong>
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', color: '#888', fontSize: '0.9rem' }}>
                        如果您投注了获胜选项，请前往"我的彩票"页面领取奖金
                      </p>
                    </div>
                    {/* 领奖按钮已移除，领奖请前往“我的彩票”页面 */}
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

export default ProjectList;
