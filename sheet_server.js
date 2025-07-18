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

app.get("/poem", async (req, res) => {
  try {
    const rowIndex = parseInt(req.query.row, 10); // ?row=숫자
    if (isNaN(rowIndex)) {
      return res.status(400).send("❌ 유효하지 않은 row 값입니다.");
    }

    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A${rowIndex}:O${rowIndex}`, // 한 행만 조회
    });

    const row = response.data.values?.[0];
    if (!row) return res.status(404).send("❌ 해당 행의 데이터가 없습니다.");

    const timestamp = row[0] || "";
    const emotion = row[1] || "";
    const poem = row[10] || "";
    const imageKeyword = row[5]?.toLowerCase() || "emotion";

    const html = `
      <html>
        <head><meta charset="UTF-8">
          <style>
            body {
              font-family: 'Noto Sans KR', sans-serif;
              background: url("https://source.unsplash.com/1600x900/?${encodeURIComponent(imageKeyword)}") no-repeat center center fixed;
              background-size: cover;
              color: white;
              text-shadow: 1px 1px 3px rgba(0,0,0,0.8);
              padding: 3em;
            }
            .container {
              background: rgba(0, 0, 0, 0.55);
              border-radius: 16px;
              padding: 2em;
              max-width: 400px;
              margin: auto;
            }
            h2 {
              font-size: 2em;
              margin-bottom: 0.5em;
            }
            pre {
              white-space: pre-wrap;
              font-size: 1.2em;
              line-height: 1.6em;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>몸의 언어 – ${emotion}</h2>
            <pre>${poem || "📭 시가 존재하지 않습니다."}</pre>
          </div>
        </body>
      </html>
    `;

    res.status(200).send(html);
  } catch (err) {
    console.error("❌ /poem 라우트 오류:", err);
    res.status(500).send("서버 오류로 시를 불러올 수 없습니다.");
  }
});
