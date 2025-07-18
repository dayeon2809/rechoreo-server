require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ───────────── 환경 변수 확인 ─────────────
console.log("📦 환경변수 확인:");
console.log("CLIENT_EMAIL:", process.env.GCP_CLIENT_EMAIL);
console.log("PRIVATE_KEY 존재 여부:", !!process.env.GCP_PRIVATE_KEY);
console.log("SHEET_ID:", process.env.SHEET_ID);

// 🔐 서비스 계정 인증
const auth = new google.auth.GoogleAuth({
  credentials: {
    type: "service_account",
    project_id: process.env.GCP_PROJECT_ID,
    private_key_id: process.env.GCP_PRIVATE_KEY_ID,
    private_key: process.env.GCP_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: process.env.GCP_CLIENT_EMAIL,
    client_id: process.env.GCP_CLIENT_ID,
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "test1";

app.post("/submit", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const data = req.body;
    const timestamp = new Date().toLocaleString();

    const row = [
      timestamp,
      data.type || "",
      data.value?.timestamp || "",
      data.value?.emotions || "",
      data.value?.q1 || "",
      data.value?.q2 || "",
      data.value?.q3 || "",
      data.value?.q4 || "",
      data.value?.q5 || "",
      data.value?.q6 || "",
      data.value?.q7 || "",
      data.value?.q8 || ""
    ];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A1`,
      valueInputOption: "RAW",
      requestBody: {
        values: [row]
      }
    });

    console.log("✅ 시트 저장 성공");
    res.status(200).send("✅ Google Sheets에 저장 완료");
  } catch (err) {
    console.error("❌ 시트 저장 실패:", err);
    res.status(500).send("Google Sheets 저장 실패");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 서버 실행됨: http://localhost:${PORT}`);
});

app.get("/poems", async (req, res) => {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A2:O`, // O열까지의 모든 데이터
    });

    const rows = response.data.values || [];

    const poems = rows.map(row => ({
      timestamp: row[0] || "",
      emotion: row[1] || "",
      poem: row[10] || "",
      qrcode: row[13] || "",
    })).filter(entry => entry.poem && entry.poem.trim() !== "");

    res.json({ poems });
  } catch (err) {
    console.error("❌ 시트 불러오기 실패:", err);
    res.status(500).send("시트에서 데이터를 불러올 수 없습니다");
  }
});
