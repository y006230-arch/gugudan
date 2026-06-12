const MODEL = "gemini-2.0-flash";
const MAX_MESSAGES = 20;
const MAX_TEXT_LEN = 500;

const SYSTEM_PROMPT = `당신은 초등학생을 위한 친절한 수학 도우미 "피카피카"입니다.
구구단, 덧셈, 뺄셈, 나눗셈을 쉽고 재미있게 설명해 주세요.
- 밝고 따뜻한 말투, 짧은 문장, 이모지는 가끔만 사용
- 정답을 바로 주기보다 단계별 힌트로 스스로 풀게 도와주기
- 수학과 무관한 주제는 정중히 거절하고 수학으로 돌려주기
- 한국어로 답변`;

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function toGeminiContents(messages) {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m.text).slice(0, MAX_TEXT_LEN) }],
  }));
}

module.exports = async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST만 지원합니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "서버에 GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수를 확인해 주세요.",
    });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "잘못된 요청 형식입니다." });
    }
  }
  if (!body || typeof body !== "object") {
    body = {};
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!messages.length) {
    return res.status(400).json({ error: "메시지가 비어 있습니다." });
  }

  const trimmed = messages
    .slice(-MAX_MESSAGES)
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.text)
    .map((m) => ({ role: m.role, text: String(m.text).trim().slice(0, MAX_TEXT_LEN) }))
    .filter((m) => m.text);

  if (!trimmed.length || trimmed[trimmed.length - 1].role !== "user") {
    return res.status(400).json({ error: "마지막 메시지는 사용자 메시지여야 합니다." });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: toGeminiContents(trimmed),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 512,
        },
      }),
    });

    const data = await upstream.json();

    if (!upstream.ok) {
      const msg =
        data?.error?.message ||
        data?.message ||
        "Gemini API 요청에 실패했습니다.";
      return res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: msg });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("") || "";

    if (!reply) {
      return res.status(502).json({ error: "응답을 생성하지 못했습니다. 다시 시도해 주세요." });
    }

    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({
      error: err?.message || "서버 오류가 발생했습니다.",
    });
  }
};
