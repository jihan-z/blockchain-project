import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ORDER_BOOK_ABI, ORDER_BOOK_ADDRESS, LOTTERY_TICKET_ABI, LOTTERY_TICKET_ADDRESS, LOTTERY_MANAGER_ABI, LOTTERY_MANAGER_ADDRESS, LOTTERY_TOKEN_ABI, LOTTERY_TOKEN_ADDRESS } from './blockchain';

interface Order {
  tokenId: number;
  price: number;
  seller: string;
  timestamp: number;
  projectId: number;
  optionId: number;
  projectName: string;
  optionName: string;
}

interface OrderBookEntry {
  tokenId: number;
  price: number;
  seller: string;
  timestamp: number;
  useToken: boolean;
}

interface ProjectOrders {
  projectId: number;
  projectName: string;
  options: {
    optionId: number;
    optionName: string;
    orders: OrderBookEntry[];
  }[];
}

interface OrderBookProps {
  wallet: string | null;
}

const OrderBook: React.FC<OrderBookProps> = ({ wallet }) => {
  const [projectOrders, setProjectOrders] = useState<ProjectOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<number | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  useEffect(() => {
    if (wallet) {
      loadOrders();
    }
  }, [wallet]);

  const loadOrders = async () => {
    if (!wallet) return;
    
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const orderBookContract = new ethers.Contract(ORDER_BOOK_ADDRESS, ORDER_BOOK_ABI, provider);
      
      // 获取所有项目
      const managerContract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, provider);
      const projectCount = await managerContract.getProjectCount();
      
      const projectsData: ProjectOrders[] = [];
      
      for (let projectId = 0; projectId < projectCount; projectId++) {
        // 使用 getProject 获取完整的项目信息（包括 options 数组）
        const projectInfo = await managerContract.getProject(projectId);
        const projectName = projectInfo[0];
        const options = projectInfo[1];
        const projectFinished = projectInfo[4]; // 检查项目是否已结束
        
        // 跳过已结束的项目
        if (projectFinished) {
          console.log(`项目 ${projectId} (${projectName}) 已结束，跳过显示订单`);
          continue;
        }
        
        const projectOrder: ProjectOrders = {
          projectId,
          projectName,
          options: []
        };
        
        // 获取每个选项的订单簿
        for (let optionId = 0; optionId < options.length; optionId++) {
          try {
            const orderBookEntries = await orderBookContract.getOrderBook(projectId, optionId);
            const optionOrders: OrderBookEntry[] = [];
            
            for (const entry of orderBookEntries) {
              // 解析价格，确保有效
              let priceValue = 0;
              try {
                priceValue = Number(ethers.formatEther(entry.price));
                if (isNaN(priceValue) || priceValue <= 0) {
                  console.warn('无效的订单价格:', entry);
                  continue; // 跳过无效订单
                }
              } catch (e) {
                console.error('解析订单价格失败:', e);
                continue; // 跳过解析失败的订单
              }
              
              // 注意：ABI 中字段名是 ticketId（已修复与合约一致）
              const tokenIdValue = Number(entry.ticketId);
              if (isNaN(tokenIdValue)) {
                console.warn('无效的 ticketId:', entry);
                continue;
              }
              
              optionOrders.push({
                tokenId: tokenIdValue,
                price: priceValue,
                seller: entry.seller,
                timestamp: Number(entry.timestamp),
                useToken: entry.useToken
              });
            }
            
            // 按价格排序（合约已经排序，这里确保一下）
            optionOrders.sort((a, b) => a.price - b.price);
            
            projectOrder.options.push({
              optionId,
              optionName: options[optionId],
              orders: optionOrders
            });
          } catch (error) {
            console.error(`获取项目${projectId}选项${optionId}订单失败:`, error);
          }
        }
        
        // 只添加有订单的项目
        if (projectOrder.options.some(opt => opt.orders.length > 0)) {
          projectsData.push(projectOrder);
        }
      }
      
      setProjectOrders(projectsData);
    } catch (error) {
      console.error('加载订单失败:', error);
      setProjectOrders([]);
    }
    setLoading(false);
  };

  const handleBuyOrder = async (tokenId: number, price: number, useToken: boolean, projectId: number, optionId: number) => {
    if (!wallet) {
      alert('请先连接钱包');
      return;
    }
    
    // 验证价格
    if (isNaN(price) || price <= 0) {
      alert('订单价格无效，请刷新页面重试');
      window.location.reload();
      return;
    }
    
    console.log('购买订单参数:', { tokenId, price, useToken, projectId, optionId });
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // 检查项目状态
      const managerContract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, provider);
      const projectInfo = await managerContract.getProject(projectId);
      const projectFinished = projectInfo[4];
      
      if (projectFinished) {
        alert('项目已结束，无法购买该彩票！\n\n已结束项目的彩票订单已自动隐藏。\n请刷新页面查看最新订单。');
        window.location.reload();
        return;
      }
      
      const orderBookContract = new ethers.Contract(ORDER_BOOK_ADDRESS, ORDER_BOOK_ABI, signer);
      const priceStr = price.toFixed(18); // 确保精度
      
      if (useToken) {
        // 使用代币支付
        const tokenContract = new ethers.Contract(LOTTERY_TOKEN_ADDRESS, LOTTERY_TOKEN_ABI, signer);
        
        console.log('使用代币支付，价格:', priceStr);
        
        // 检查代币余额
        const balance = await tokenContract.balanceOf(wallet);
        const requiredAmount = ethers.parseEther(priceStr);
        console.log('代币余额:', ethers.formatEther(balance), 'LTK, 需要:', priceStr, 'LTK');
        
        if (balance < requiredAmount) {
          return alert('代币余额不足，请先领取测试代币');
        }
        
        // 批准代币转账
        console.log('授权代币转账...');
        const approveTx = await tokenContract.approve(ORDER_BOOK_ADDRESS, requiredAmount);
        await approveTx.wait();
        console.log('代币授权成功');
        
        // 购买订单 - 传递完整参数
        console.log('购买订单（代币）...');
        const tx = await orderBookContract.fillOrder(tokenId, projectId, optionId);
        console.log('交易已提交:', tx.hash);
        await tx.wait();
        console.log('交易已确认');
      } else {
        // 使用ETH支付 - 传递完整参数
        console.log('使用ETH支付，价格:', priceStr);
        const priceWei = ethers.parseEther(priceStr);
        
        console.log('购买订单（ETH）...');
        const tx = await orderBookContract.fillOrder(tokenId, projectId, optionId, { 
          value: priceWei
        });
        console.log('交易已提交:', tx.hash);
        await tx.wait();
        console.log('交易已确认');
      }
      
      alert('购买成功！');
      loadOrders();
    } catch (error: any) {
      console.error('购买失败 - 完整错误:', error);
      
      let errorMsg = '未知错误';
      if (error.code === 'CALL_EXCEPTION') {
        errorMsg = '购买失败，可能原因：\n';
        errorMsg += '1. 订单已被取消或购买\n';
        errorMsg += '2. 余额不足\n';
        errorMsg += '3. 价格不匹配';
      } else if (error.reason) {
        errorMsg = error.reason;
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      alert(`购买失败:\n${errorMsg}`);
    }
  };

  const getTotalOrdersCount = () => {
    return projectOrders.reduce((total, project) => 
      total + project.options.reduce((optTotal, option) => 
        optTotal + option.orders.length, 0), 0);
  };

  const getBestPrice = (orders: OrderBookEntry[]) => {
    if (orders.length === 0) return null;
    return Math.min(...orders.map(order => order.price));
  };

  if (!wallet) {
    return (
      <div className="order-book">
        <h2 className="gradient-title">订单簿</h2>
        <div className="wallet-not-connected">
          <p>请先连接钱包查看订单簿</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="order-book">
        <h2 className="gradient-title">订单簿</h2>
        <div className="loading">
          <div className="spinner"></div>
          <p>加载订单中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="order-book">
      <h2 className="gradient-title">订单簿</h2>
      
      <div className="order-stats">
        <span className="stat-badge">总订单数: {getTotalOrdersCount()}</span>
        <span className="stat-badge">进行中项目: {projectOrders.length}</span>
      </div>
      
      <div style={{ 
        background: 'rgba(255, 153, 0, 0.1)', 
        border: '1px solid rgba(255, 153, 0, 0.3)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1rem',
        fontSize: '0.9rem',
        color: '#ff9900'
      }}>
        💡 提示：已结束项目的彩票订单不会显示在订单簿中
      </div>
      
      {projectOrders.length === 0 ? (
        <div className="empty-state">
          <p>暂无订单</p>
        </div>
      ) : (
        <div className="order-book-container">
          {/* 项目选择器 */}
          <div className="project-selector">
            <h3>选择项目</h3>
            <div className="project-list">
              {projectOrders.map((project) => (
                <button
                  key={project.projectId}
                  className={`project-tab ${selectedProject === project.projectId ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedProject(project.projectId);
                    setSelectedOption(null);
                  }}
                >
                  {project.projectName}
                  <span className="order-count">
                    {project.options.reduce((total, option) => total + option.orders.length, 0)}
                  </span>
                </button>
              ))}
            </div>
          </div>
          
          {/* 选项和订单显示 */}
          <div className="orders-display">
            {selectedProject === null ? (
              <div className="select-project-prompt">
                <p>请选择一个项目查看订单簿</p>
              </div>
            ) : (
              <>
                {/* 选项选择器 */}
                <div className="option-selector">
                  <h3>选择选项</h3>
                  <div className="option-list">
                    {projectOrders
                      .find(p => p.projectId === selectedProject)?.options
                      .map((option) => (
                        <button
                          key={option.optionId}
                          className={`option-tab ${selectedOption === option.optionId ? 'active' : ''}`}
                          onClick={() => setSelectedOption(option.optionId)}
                        >
                          {option.optionName}
                          <span className="order-count">{option.orders.length}</span>
                        </button>
                      ))}
                  </div>
                </div>
                
                {/* 订单列表 */}
                <div className="orders-section">
                  {selectedOption === null ? (
                    <div className="select-option-prompt">
                      <p>请选择一个选项查看详细订单</p>
                    </div>
                  ) : (
                    <>
                      <div className="option-header">
                        <h3>
                          {projectOrders.find(p => p.projectId === selectedProject)?.projectName} - 
                          {projectOrders.find(p => p.projectId === selectedProject)?.options
                            .find(o => o.optionId === selectedOption)?.optionName}
                        </h3>
                        <div className="price-info">
                            <span className="best-price">
                              最优价格: {getBestPrice(
                                projectOrders.find(p => p.projectId === selectedProject)?.options
                                  .find(o => o.optionId === selectedOption)?.orders || []
                              )?.toFixed(4) || '暂无'} 
                              {projectOrders.find(p => p.projectId === selectedProject)?.options
                                .find(o => o.optionId === selectedOption)?.orders[0]?.useToken ? 'LTK' : 'ETH'}
                            </span>
                            <span className="total-orders">
                              总订单数: {
                                projectOrders.find(p => p.projectId === selectedProject)?.options
                                  .find(o => o.optionId === selectedOption)?.orders.length || 0
                              }
                            </span>
                          </div>
                      </div>
                      
                      <div className="orders-list">
                        <div className="orders-header">
                          <span>Token ID</span>
                          <span>价格 (ETH)</span>
                          <span>卖家</span>
                          <span>操作</span>
                        </div>
                        
                        {projectOrders
                          .find(p => p.projectId === selectedProject)?.options
                          .find(o => o.optionId === selectedOption)?.orders
                          .map((order) => (
                            <div key={order.tokenId} className="order-card">
                              <span className="token-id">#{order.tokenId}</span>
                              <span className="price">
                                {order.price.toFixed(4)} {order.useToken ? 'LTK' : 'ETH'}
                                {order.useToken && <span className="token-badge">代币</span>}
                              </span>
                              <span className="seller">
                                {order.seller.slice(0, 6)}...{order.seller.slice(-4)}
                              </span>
                              <button 
                                className="buy-button"
                                onClick={() => handleBuyOrder(order.tokenId, order.price, order.useToken, selectedProject!, selectedOption!)}
                              >
                                购买
                              </button>
                            </div>
                          )) || []}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderBook;
