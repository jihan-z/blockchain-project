import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { LOTTERY_TICKET_ABI, LOTTERY_TICKET_ADDRESS, ORDER_BOOK_ABI, ORDER_BOOK_ADDRESS, LOTTERY_MANAGER_ABI, LOTTERY_MANAGER_ADDRESS, LOTTERY_TOKEN_ABI, LOTTERY_TOKEN_ADDRESS } from './blockchain';

interface TicketInfo {
  tokenId: string;
  projectId: string;
  optionId: string;
  isListed: boolean;
  price?: string;
  projectName?: string;
  projectFinished?: boolean;
  projectWon?: boolean;
  claimed?: boolean;
  optionName?: string;
  amount?: string; // 彩票购买金额
  purchasePrice?: string; // 从订单簿购买的价格
}

interface MyTicketsProps {
  wallet: string | null;
}

const MyTickets: React.FC<MyTicketsProps> = ({ wallet }) => {
  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [sellPrices, setSellPrices] = useState<{[key: number]: string}>({});

  useEffect(() => {
    const fetchTickets = async () => {
      if (!wallet) {
        setTickets([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // 检查是否有以太坊提供者
        if (!(window as any).ethereum) {
          console.log('未检测到以太坊钱包');
          setTickets([]);
          setTokenBalance('0');
          return;
        }
        
        // 连接 provider
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const ticketContract = new ethers.Contract(LOTTERY_TICKET_ADDRESS, LOTTERY_TICKET_ABI, provider);
        const orderBook = new ethers.Contract(ORDER_BOOK_ADDRESS, ORDER_BOOK_ABI, provider);
        
        // 获取代币余额
        const tokenContract = new ethers.Contract(LOTTERY_TOKEN_ADDRESS, LOTTERY_TOKEN_ABI, provider);
        const balance = await tokenContract.balanceOf(wallet);
        setTokenBalance(ethers.formatEther(balance));
        
        // 获取 NFT 数量
        const nftBalance = await ticketContract.balanceOf(wallet);
        const managerContract = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, provider);
        
        const ticketsArr: TicketInfo[] = [];
        for (let i = 0; i < nftBalance; i++) {
          const tokenId = await ticketContract.tokenOfOwnerByIndex(wallet, i);
          const [projectId, optionId] = await ticketContract.getTicketInfo(tokenId);
          
          // 获取项目信息
          const projectInfo = await managerContract.getProject(projectId);
          const projectName = projectInfo[0];
          const options = projectInfo[1];
          const projectFinished = projectInfo[4];
          const winningOption = Number(projectInfo[5]);
          
          // 直接使用 tokenId 获取彩票详情
          // tokenId 就是 LotteryManager 中的 ticketId (tickets 数组的索引)
          const ticketDetails = await managerContract.getTicket(tokenId);
          const ticketAmount = ethers.formatEther(ticketDetails[2]); // 获取彩票金额
          const claimed = ticketDetails[4];
          
          // 判断是否中奖
          const projectWon = projectFinished && Number(optionId) === winningOption;
          
          // 查询是否已挂单
          const order = await orderBook.getOrder(tokenId);
          const isListed = order[2];
          const listingPrice = isListed ? ethers.formatEther(order[1]) : undefined;
          
          // 获取项目是否使用代币
          const projectUseToken = projectInfo[7];
          
          ticketsArr.push({
            tokenId: tokenId.toString(),
            projectId: projectId.toString(),
            optionId: optionId.toString(),
            isListed,
            price: listingPrice,
            projectName,
            projectFinished,
            projectWon,
            claimed,
            optionName: options[Number(optionId)],
            amount: ticketAmount,
            purchasePrice: ticketAmount // 初始购买价格就是 amount
          });
        }
        setTickets(ticketsArr);
      } catch (e) {
        console.error('获取彩票失败:', e);
        setTickets([]);
        setTokenBalance('0');
      }
      setLoading(false);
    };
    fetchTickets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);

  const handleList = async (tokenId: string, projectFinished: boolean) => {
    if (projectFinished) {
      alert('项目已结束，无法挂单');
      return;
    }
    
    const price = window.prompt('请输入挂单价格');
    if (!price) return;
    
    const useToken = window.confirm('是否使用代币支付？\n点击"确定"使用代币(LTK)，点击"取消"使用ETH');
    
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      
      // 获取项目信息以确定projectId和optionId
      const ticketContract = new ethers.Contract(LOTTERY_TICKET_ADDRESS, LOTTERY_TICKET_ABI, signer);
      const [projectId, optionId] = await ticketContract.getTicketInfo(tokenId);
      
      // 先授权 OrderBook 合约转移 NFT
      const approveTx = await ticketContract.approve(ORDER_BOOK_ADDRESS, tokenId);
      await approveTx.wait();
      console.log('NFT 授权成功');
      
      // 创建订单
      const orderBook = new ethers.Contract(ORDER_BOOK_ADDRESS, ORDER_BOOK_ABI, signer);
      const tx = await orderBook.placeOrder(tokenId, ethers.parseEther(price), projectId, optionId, useToken);
      await tx.wait();
      alert('挂单成功');
      window.location.reload();
    } catch (e: any) {
      console.error('挂单失败:', e);
      alert(`挂单失败: ${e.reason || e.message || '未知错误'}`);
    }
  };

  const handleCancel = async (tokenId: string, projectId: string, optionId: string) => {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const orderBook = new ethers.Contract(ORDER_BOOK_ADDRESS, ORDER_BOOK_ABI, signer);
      
      console.log('取消挂单参数:', { tokenId, projectId, optionId });
      
      const tx = await orderBook.cancelOrder(tokenId, projectId, optionId);
      console.log('交易已提交:', tx.hash);
      await tx.wait();
      console.log('交易已确认');
      
      alert('取消挂单成功');
      window.location.reload();
    } catch (e: any) {
      console.error('取消挂单失败 - 完整错误:', e);
      
      let errorMsg = '取消失败';
      if (e.code === 'CALL_EXCEPTION') {
        errorMsg = '取消失败，可能原因：\n';
        errorMsg += '1. 订单不存在或已取消\n';
        errorMsg += '2. 不是订单创建者\n';
        errorMsg += '3. 订单已被购买';
      } else if (e.reason) {
        errorMsg = e.reason;
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      alert(errorMsg);
    }
  };

  const handleClaim = async (tokenId: string, projectId: string) => {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const manager = new ethers.Contract(LOTTERY_MANAGER_ADDRESS, LOTTERY_MANAGER_ABI, signer);
      // 使用 claimPrize 函数，传入项目ID
      const tx = await manager.claimPrize(projectId);
      await tx.wait();
      alert('领奖成功');
      window.location.reload();
    } catch (e: any) {
      console.error('领奖失败:', e);
      alert(`领奖失败: ${e.reason || e.message || '未知错误'}`);
    }
  };

  const handleClaimToken = async () => {
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const tokenContract = new ethers.Contract(LOTTERY_TOKEN_ADDRESS, LOTTERY_TOKEN_ABI, signer);
      const tx = await tokenContract.claim();
      await tx.wait();
      alert('领取代币成功');
      window.location.reload();
    } catch (e) {
      alert('已经领取代币');
    }
  };

  if (!wallet) return (
    <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
      <h3>请先连接钱包</h3>
    </div>
  );
  
  if (loading) return (
    <div className="loading">
      <div className="spinner"></div>
      <p>加载中...</p>
    </div>
  );
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#00ff88' }}>我的彩票 NFT</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#888' }}>代币余额: <strong style={{ color: '#00ff88' }}>{tokenBalance} LTK</strong></span>
          <button className="btn btn-secondary" onClick={handleClaimToken}>🪙 领取测试代币</button>
        </div>
      </div>
      
      <div style={{ 
        background: 'rgba(0, 204, 255, 0.1)', 
        border: '1px solid rgba(0, 204, 255, 0.3)',
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        marginBottom: '1.5rem',
        fontSize: '0.9rem',
        color: '#00ccff'
      }}>
        💡 提示：<strong>彩票价值</strong>是该彩票在竞猜时的投注金额。如果从订单簿购买，显示的是原始投注金额，而非您的购买价格。
      </div>
      
      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>
          <h3>暂无彩票</h3>
          <p>购买彩票后会在这里显示</p>
        </div>
      ) : (
        <div className="project-grid">
          {tickets.map(t => (
            <div key={t.tokenId} className="project-card">
              <div className="project-header">
                <h3 className="project-title">#{t.tokenId} - {t.projectName}</h3>
                {t.projectFinished && (
                  <span className={`project-status ${t.projectWon ? 'status-won' : 'status-lost'}`}>
                    {t.projectWon ? '✅ 已中奖' : '❌ 未中奖'}
                  </span>
                )}
                {!t.projectFinished && (
                  <span className="project-status status-active">进行中</span>
                )}
              </div>
              
              <div className="project-details">
                <div className="project-detail">
                  <span className="label">投注选项:</span>
                  <span className="value">{t.optionName}</span>
                </div>
                <div className="project-detail">
                  <span className="label">彩票价值:</span>
                  <span className="value" style={{ color: '#00ccff', fontWeight: 'bold' }}>
                    {t.amount || '0'} ETH/LTK
                  </span>
                </div>
                {t.isListed && (
                  <div className="project-detail">
                    <span className="label">挂单价格:</span>
                    <span className="value" style={{ color: '#ff9900', fontWeight: 'bold' }}>
                      {t.price} ETH/LTK
                    </span>
                  </div>
                )}
                {!t.isListed && (
                  <div className="project-detail">
                    <span className="label">挂单状态:</span>
                    <span className="value" style={{ color: '#666' }}>未挂单</span>
                  </div>
                )}
                {t.projectFinished && t.projectWon && (
                  <div className="project-detail">
                    <span className="label">领奖状态:</span>
                    <span className="value" style={{ color: t.claimed ? '#00ff88' : '#ff9900' }}>
                      {t.claimed ? '✅ 已领奖' : '⏳ 待领奖'}
                    </span>
                  </div>
                )}
                
                <div className="project-actions" style={{ marginTop: '1rem' }}>
                  {!t.projectFinished && !t.isListed && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleList(t.tokenId, t.projectFinished || false)}
                    >
                      📤 挂单出售
                    </button>
                  )}
                  
                  {t.projectFinished && !t.isListed && (
                    <button 
                      className="btn btn-secondary"
                      disabled
                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    >
                      🔒 项目已结束
                    </button>
                  )}
                  
                  {t.isListed && (
                    <>
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleCancel(t.tokenId, t.projectId, t.optionId)}
                      >
                        ❌ 取消挂单
                      </button>
                      {t.projectFinished && (
                        <div style={{
                          background: 'rgba(255, 153, 0, 0.1)',
                          border: '1px solid rgba(255, 153, 0, 0.3)',
                          borderRadius: '6px',
                          padding: '0.5rem',
                          marginTop: '0.5rem',
                          fontSize: '0.85rem',
                          color: '#ff9900'
                        }}>
                          ⚠️ 项目已结束，建议取消挂单
                        </div>
                      )}
                    </>
                  )}
                  
                  {t.projectFinished && t.projectWon && !t.claimed && (
                    <button 
                      className="btn btn-success"
                      onClick={() => handleClaim(t.tokenId, t.projectId)}
                    >
                      💰 领取奖金
                    </button>
                  )}
                  
                  {t.projectFinished && t.projectWon && t.claimed && (
                    <button 
                      className="btn btn-secondary"
                      disabled
                      style={{ opacity: 0.5, cursor: 'not-allowed' }}
                    >
                      ✅ 已领取
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTickets;
