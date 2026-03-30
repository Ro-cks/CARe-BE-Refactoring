/**
 * Privy 지갑 생성 프록시 서버
 * 공식 문서: https://docs.privy.io/basics/nodeJS/quickstart
 *
 * 실행: node privy-server.mjs
 * 포트: 3001
 */

import { PrivyClient } from '@privy-io/node';
import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '../.env') });

//VITE_ 접두어 버전도 매핑
if (!process.env.PRIVY_APP_ID && process.env.VITE_PRIVY_APP_ID) {
  process.env.PRIVY_APP_ID = process.env.VITE_PRIVY_APP_ID
}

const app = express();
app.use(cors());
app.use(express.json());

// Privy 공식 SDK 초기화
const privy = new PrivyClient({
  appId: process.env.VITE_PRIVY_APP_ID || process.env.PRIVY_APP_ID,
  appSecret: process.env.PRIVY_APP_SECRET,
});

/**
 * POST /privy/wallet
 * 회원가입 시 사용자 이메일로 Privy 사용자 + 이더리움 지갑 생성
 *
 * Request body: { email: string }
 * Response: { walletAddress: string, walletId: string, privyUserId: string }
 */
app.post('/privy/wallet', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  try {
    // 1. Privy 사용자 생성 (이메일 연동)
    const user = await privy.users().create({
      linked_accounts: [{ type: 'email', address: email }],
    });
    console.log('[Privy] 사용자 생성:', user.id);

    // 2. 이더리움 지갑 생성 (사용자 소유)
    const wallet = await privy.wallets().create({
      chain_type: 'ethereum',
      owner: { user_id: user.id },
    });
    console.log('[Privy] 지갑 생성:', wallet.address);

    res.json({
      walletAddress: wallet.address,
      walletId: wallet.id,
      privyUserId: user.id,
    });
  } catch (error) {
    console.error('[Privy] 오류:', error.status, error.name, error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('[Privy Server] http://localhost:3001');
});
