import React, { useState, useEffect } from 'react';
import './App.css';
import ProjectList from './ProjectList';
import MyTickets from './MyTickets';
import OrderBook from './OrderBook';
import ProjectManager from './ProjectManager';

function App() {
  const [wallet, setWallet] = useState<string | null>(null);











  const [activeTab, setActiveTab] = useState('projects');

  const connectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        setWallet(accounts[0]);
      } catch (err) {
        alert('钱包连接失败');
      }
    } else {
      alert('请安装 MetaMask');
    }
  };

  // 自动连接钱包
  useEffect(() => {
    const checkConnection = async () => {
      if ((window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setWallet(accounts[0]);
          }
        } catch (error) {
          console.log('钱包连接检查失败:', error);
        }
      }
    };
    checkConnection();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectList wallet={wallet} />;
      case 'tickets':
        return <MyTickets wallet={wallet} />;
      case 'orderbook':
        return <OrderBook wallet={wallet} />;
      case 'manager':
        return <ProjectManager wallet={wallet} />;
      default:
        return <ProjectList wallet={wallet} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Polymarket 去中心化竞猜系统</h1>
        <button 
          className="wallet-button" 
          onClick={connectWallet}
          disabled={!!wallet}
        >
          {wallet ? `已连接: ${wallet.slice(0, 6)}...${wallet.slice(-4)}` : '连接钱包'}
        </button>
      </header>
      
      <main>
        <div className="section">
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('projects')}
            >
              🎯 竞猜项目
            </button>
            <button 
              className={`btn ${activeTab === 'tickets' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('tickets')}
            >
              🎫 我的彩票
            </button>
            <button 
              className={`btn ${activeTab === 'orderbook' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('orderbook')}
            >
              📊 链上订单簿
            </button>
            <button 
              className={`btn ${activeTab === 'manager' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActiveTab('manager')}
            >
              ⚙️ 项目管理
            </button>
          </div>
          
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
