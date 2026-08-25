import { useState, useRef, useEffect, useCallback } from "react";

const AUTH_USER_KEY = "agrimind_backend_user_v1";
const AUTH_TOKEN_KEY = "agrimind_backend_token_v1";
const LEGACY_AUTH_KEYS = ["agrimind_auth_users_v3","agrimind_auth_session_v3","agrimind_current_user","agrimind_auth_session","agrimind_auth_users"];

function getInitialAuthMode() { const p = window.location.pathname.toLowerCase(); const h = window.location.hash.toLowerCase(); return p.includes("signup") || h.includes("signup") ? "signup" : "login"; }
function isForcedAuthRoute() { const p = window.location.pathname.toLowerCase(); const h = window.location.hash.toLowerCase(); return p.includes("login") || p.includes("signup") || h.includes("login") || h.includes("signup"); }
function safeJsonParse(v, f) { try { return JSON.parse(v); } catch { return f; } }

async function apiRequest(path, opts = {}) {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function readGroqLikeResponse(res, setStreamText) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    const full = data.reply || data.content || data.message || "";
    setStreamText(full);
    return full;
  }
  if (!res.ok) { const t = await res.text().catch(() => ""); throw new Error(t || `Request failed (${res.status})`); }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    for (const line of decoder.decode(value).split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const d = line.slice(6).trim();
      if (d === "[DONE]") break;
      try { full += JSON.parse(d).choices?.[0]?.delta?.content || ""; setStreamText(full); } catch {}
    }
  }
  return full;
}

const PAKISTAN_CITIES = [
  { name:"Multan",province:"Punjab",lat:30.1575,lng:71.5249 },
  { name:"Lahore",province:"Punjab",lat:31.5204,lng:74.3587 },
  { name:"Faisalabad",province:"Punjab",lat:31.4504,lng:73.1350 },
  { name:"Rawalpindi",province:"Punjab",lat:33.5651,lng:73.0169 },
  { name:"Gujranwala",province:"Punjab",lat:32.1877,lng:74.1945 },
  { name:"Sargodha",province:"Punjab",lat:32.0836,lng:72.6711 },
  { name:"Bahawalpur",province:"Punjab",lat:29.3956,lng:71.6836 },
  { name:"Sialkot",province:"Punjab",lat:32.4945,lng:74.5229 },
  { name:"Sheikhupura",province:"Punjab",lat:31.7167,lng:73.9850 },
  { name:"Rahim Yar Khan",province:"Punjab",lat:28.4202,lng:70.2952 },
  { name:"Jhang",province:"Punjab",lat:31.2681,lng:72.3181 },
  { name:"Dera Ghazi Khan",province:"Punjab",lat:30.0463,lng:70.6401 },
  { name:"Gujrat",province:"Punjab",lat:32.5736,lng:74.0790 },
  { name:"Sahiwal",province:"Punjab",lat:30.6682,lng:73.1066 },
  { name:"Wah Cantt",province:"Punjab",lat:33.7715,lng:72.7084 },
  { name:"Okara",province:"Punjab",lat:30.8138,lng:73.4534 },
  { name:"Kasur",province:"Punjab",lat:31.1204,lng:74.4470 },
  { name:"Khanewal",province:"Punjab",lat:30.3015,lng:71.9328 },
  { name:"Hafizabad",province:"Punjab",lat:32.0714,lng:73.6881 },
  { name:"Pakpattan",province:"Punjab",lat:30.3437,lng:73.3874 },
  { name:"Karachi",province:"Sindh",lat:24.8607,lng:67.0011 },
  { name:"Hyderabad",province:"Sindh",lat:25.3960,lng:68.3578 },
  { name:"Sukkur",province:"Sindh",lat:27.7052,lng:68.8574 },
  { name:"Larkana",province:"Sindh",lat:27.5570,lng:68.2264 },
  { name:"Nawabshah",province:"Sindh",lat:26.2442,lng:68.4100 },
  { name:"Mirpur Khas",province:"Sindh",lat:25.5270,lng:69.0110 },
  { name:"Jacobabad",province:"Sindh",lat:28.2769,lng:68.4386 },
  { name:"Shikarpur",province:"Sindh",lat:27.9558,lng:68.6380 },
  { name:"Peshawar",province:"KPK",lat:34.0151,lng:71.5249 },
  { name:"Mardan",province:"KPK",lat:34.2010,lng:72.0449 },
  { name:"Abbottabad",province:"KPK",lat:34.1688,lng:73.2215 },
  { name:"Mingora",province:"KPK",lat:34.7717,lng:72.3600 },
  { name:"Kohat",province:"KPK",lat:33.5869,lng:71.4429 },
  { name:"Bannu",province:"KPK",lat:32.9891,lng:70.6000 },
  { name:"Dera Ismail Khan",province:"KPK",lat:31.8314,lng:70.9019 },
  { name:"Nowshera",province:"KPK",lat:34.0153,lng:71.9747 },
  { name:"Quetta",province:"Balochistan",lat:30.1798,lng:66.9750 },
  { name:"Turbat",province:"Balochistan",lat:26.0023,lng:63.0440 },
  { name:"Khuzdar",province:"Balochistan",lat:27.8000,lng:66.6167 },
  { name:"Gwadar",province:"Balochistan",lat:25.1216,lng:62.3254 },
  { name:"Hub",province:"Balochistan",lat:25.0500,lng:66.8900 },
  { name:"Islamabad",province:"Federal Capital",lat:33.6844,lng:73.0479 },
  { name:"Mirpur",province:"AJK",lat:33.1476,lng:73.7506 },
  { name:"Muzaffarabad",province:"AJK",lat:34.3700,lng:73.4710 },
  { name:"Gilgit",province:"Gilgit-Baltistan",lat:35.9221,lng:74.3087 },
  { name:"Skardu",province:"Gilgit-Baltistan",lat:35.2971,lng:75.6333 },
];

const PAKISTAN_DISTRICTS = ["Attock","Bahawalnagar","Bahawalpur","Bhakkar","Chakwal","Chiniot","Dera Ghazi Khan","Faisalabad","Gujranwala","Gujrat","Hafizabad","Jhang","Jhelum","Kasur","Khanewal","Khushab","Lahore","Layyah","Lodhran","Mandi Bahauddin","Mianwali","Multan","Muzaffargarh","Nankana Sahib","Narowal","Okara","Pakpattan","Rahim Yar Khan","Rajanpur","Rawalpindi","Sahiwal","Sargodha","Sheikhupura","Sialkot","Toba Tek Singh","Vehari","Badin","Dadu","Ghotki","Hyderabad","Jacobabad","Jamshoro","Karachi","Kashmore","Khairpur","Larkana","Matiari","Mirpur Khas","Naushahro Feroze","Nawabshah","Qambar Shahdadkot","Sanghar","Shikarpur","Sukkur","Tando Allahyar","Tando Muhammad Khan","Thatta","Umerkot","Abbottabad","Bajaur","Bannu","Battagram","Bunir","Charsadda","Chitral","Dera Ismail Khan","Dir Lower","Dir Upper","Hangu","Haripur","Karak","Kohat","Kohistan","Kurram","Lakki Marwat","Malakand","Mansehra","Mardan","Mohmand","North Waziristan","Nowshera","Orakzai","Peshawar","Shangla","South Waziristan","Swabi","Swat","Tank","Torghar","Awaran","Barkhan","Chagai","Dera Bugti","Gwadar","Harnai","Hub","Jaffarabad","Jhal Magsi","Kalat","Kech","Kharan","Khuzdar","Killa Abdullah","Killa Saifullah","Kohlu","Lasbela","Loralai","Mastung","Musakhel","Nasirabad","Nushki","Panjgur","Pishin","Quetta","Sherani","Sibi","Sohbatpur","Turbat","Washuk","Zhob","Ziarat","Islamabad","Mirpur","Muzaffarabad","Neelum","Haveli","Bagh","Kotli","Poonch","Sudhnoti","Astore","Ghanche","Ghizer","Gilgit","Hunza","Kharmang","Nagar","Shigar","Skardu"].sort();

const GROQ_MODELS = [
  { id: "openai/gpt-oss-120b", label: "GPT OSS 120B", desc: "Best quality" },
  { id: "qwen/qwen3.6-27b", label: "Qwen 3.6 27B", desc: "Balanced" },
  { id: "groq/compound-mini", label: "Compound Mini", desc: "Fastest" },
];

const EXPERT_MODES = [
  { id:"agronomist",label:"Agronomist",icon:"🌾",desc:"Crop management & yield",prompt:"You are an expert agronomist. Provide professional guidance on crop management, soil fertility, seeding rates, nutrient scheduling, crop physiology, and yield optimization." },
  { id:"crop_doctor",label:"Crop Doctor",icon:"🔬",desc:"Disease diagnosis & treatment",prompt:"You are a plant pathologist and crop doctor. Diagnose crop diseases, nutrient deficiencies, leaf discoloration, fungal/bacterial/viral symptoms, and suggest precise treatments with specific product names." },
  { id:"pest_id",label:"Pest Expert",icon:"🐛",desc:"Pest ID & IPM strategies",prompt:"You are an entomologist and pest management expert. Identify pests, explain life cycles, damage symptoms, prevention methods, IPM strategies, and pesticide recommendations." },
  { id:"soil",label:"Soil Expert",icon:"🪨",desc:"Soil health & fertility",prompt:"You are a soil scientist. Analyze soil issues, pH imbalances, nutrient deficiencies, salinity, organic matter management, and provide detailed fertilizer recommendations." },
  { id:"irrigation",label:"Irrigation Advisor",icon:"💧",desc:"Water management & scheduling",prompt:"You are an irrigation and water management expert. Recommend irrigation schedules, water-saving methods, drip/sprinkler suitability, moisture management, and drought prevention strategies." },
  { id:"rotation",label:"Crop Rotation",icon:"🔄",desc:"Season-wise rotation planning",prompt:"You are a crop rotation planning expert. Generate season-wise rotation plans based on soil type, climate, previous crops, and nutrient balance for maximum sustainability." },
  { id:"weather",label:"Weather Advisory",icon:"🌦️",desc:"Weather-based crop advice",prompt:"You are a meteorological agricultural advisor. Provide crop advice based on weather conditions, rainfall, humidity, frost risk, heat stress, and seasonal forecasts." },
  { id:"research",label:"Research Assistant",icon:"📚",desc:"Scientific agriculture answers",prompt:"You are an agricultural research scientist. Answer scientific agriculture questions with detailed explanations. When asked about research papers, always provide: (1) full paper titles, (2) author names, (3) journal names and publication years, (4) DOI links or Google Scholar / PubMed / ResearchGate URLs where available." },
  { id:"calculator",label:"Fertilizer Calc",icon:"🧮",desc:"Doses, ratios & schedules",prompt:"You are a fertilizer and pesticide calculation expert. Calculate fertilizer doses, pesticide mixing ratios, acre/hectare conversions, and nutrient application schedules with step-by-step math." },
  { id:"livestock",label:"Livestock",icon:"🐄",desc:"Animal health & management",prompt:"You are a veterinary and livestock expert. Provide guidance on animal health, feeding schedules, vaccination programs, and farm management for livestock and poultry." },
  { id:"market",label:"Market Advisor",icon:"📈",desc:"Prices & market trends",prompt:"You are an agricultural market analyst. Provide crop market trends, price guidance, storage advice, and optimal harvest timing recommendations." },
];

const QUICK_CHIPS = [
  "Leaves turning yellow 🍂", "Best fertilizer for wheat?", "How to treat fungal infection?",
  "Drip vs sprinkler irrigation", "Crop rotation for cotton", "Soil pH guide",
  "Organic pest control", "When to harvest tomatoes?",
];

const SYSTEM_ONGOING = `You are AgriMind, an elite AI agricultural advisor. You are highly knowledgeable, practical, and farmer-friendly. This is an ongoing conversation — answer every message helpfully, including follow-ups, clarifications, "tell me more", "explain that", greetings, thanks, or anything else the user says. If the user asks for references, citations, paper links, DOIs, or sources from a previous answer, always provide them in full — author, title, journal, year, and URL/DOI. This is a normal and expected part of research conversations.

For agriculture questions always:
- Give specific, actionable advice with product names where relevant
- Ask clarifying questions when needed (crop type, location, symptoms, soil type)
- Structure answers with clear sections using markdown
- Mention safety warnings for pesticides/chemicals
- Respond in the same language the user writes in (English, Urdu اردو, or Sindhi سنڌي)
- Use bullet points, numbered lists, and headers for readability
- Be thorough but concise`;

const SYSTEM_FIRST = `You are AgriMind, an elite AI agricultural advisor. You are highly knowledgeable, practical, and farmer-friendly.

OFF-TOPIC BLOCK (first message only): If the user's very first message is clearly unrelated to agriculture — for example "build me a portfolio", "write a poem", "help with math", "create a resume", "translate a legal document" — respond with ONLY these three emojis and nothing else: 🌾🚫🤖

If the message is about farming, crops, soil, irrigation, livestock, pests, fertilizers, plant diseases, weather, or food production — answer fully and helpfully.

For agriculture questions always:
- Give specific, actionable advice with product names where relevant
- Ask clarifying questions when needed (crop type, location, symptoms, soil type)
- Structure answers with clear sections using markdown
- Mention safety warnings for pesticides/chemicals
- Respond in the same language the user writes in (English, Urdu اردو, or Sindhi سنڌي)
- Use bullet points, numbered lists, and headers for readability
- Be thorough but concise`;

const OFFTOPIC_PATTERNS = [
  /build\s+(me\s+)?(a\s+)?portfolio/i,/make\s+(me\s+)?(a\s+)?portfolio/i,/create\s+(me\s+)?(a\s+)?portfolio/i,
  /write\s+(me\s+)?(a\s+)?resume/i,/make\s+(me\s+)?(a\s+)?resume/i,/build\s+(me\s+)?(a\s+)?website/i,
  /create\s+(me\s+)?(a\s+)?website/i,/write\s+(me\s+)?(a\s+)?(poem|song|story|essay|novel)/i,
  /help\s+(me\s+)?(with\s+)?(my\s+)?math\s+homework/i,/translate\s+(this\s+)?(legal|law|contract)/i,
  /write\s+(me\s+)?(a\s+)?cover\s+letter/i,
];

/* ── Floating Particles Background ── */
function Particles({ dark }) {
  return (
    <div className="particles-container">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className={`particle particle-${i % 4}`} style={{
          left: `${(i * 5.8) % 100}%`,
          animationDelay: `${i * 0.7}s`,
          animationDuration: `${12 + (i % 5) * 3}s`,
          opacity: dark ? 0.06 : 0.1,
        }} />
      ))}
    </div>
  );
}

/* ── Animated Dots Loader ── */
function Dots({ color = "#22c55e" }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "2px 0" }}>
      {[0,1,2].map(i => (
        <div key={i} className="dot-bounce" style={{
          width: 8, height: 8, borderRadius: "50%", background: color,
          animationDelay: `${i * 0.15}s`,
        }} />
      ))}
    </div>
  );
}

/* ── Main Component ── */
export default function AgriAssistant() {
  const [apiKey, setApiKey] = useState("backend");
  const [keyInput, setKeyInput] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [authUser, setAuthUser] = useState(() => isForcedAuthRoute() ? null : safeJsonParse(localStorage.getItem(AUTH_USER_KEY), null));
  const [authMode, setAuthMode] = useState(() => getInitialAuthMode());
  const [authError, setAuthError] = useState("");
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🌱 **Assalam-o-Alaikum! Welcome to AgriMind.**\n\nI'm your free AI agricultural advisor powered by **Groq**. I can help you with:\n\n- 🔬 Crop disease diagnosis\n- 🐛 Pest identification & control\n- 💧 Irrigation planning\n- 🪨 Soil health & fertilizers\n- 🌾 Complete crop management\n- 🧮 Fertilizer & spray calculations\n\nSelect an **Expert Mode** from the menu or just ask your question!\n\nکھیتی باڑی کے بارے میں کیا جاننا چاہتے ہیں؟ 🌿" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [activeMode, setActiveMode] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => window.innerWidth < 1100 && window.innerWidth >= 768);
  const [darkMode, setDarkMode] = useState(false);
  const [farmProfile, setFarmProfile] = useState({ location:"", district:"", cropType:"", soilType:"", size:"", latitude:"", longitude:"" });
  const [showProfile, setShowProfile] = useState(false);
  const [showWeatherCity, setShowWeatherCity] = useState(false);
  const [weatherCity, setWeatherCity] = useState(() => { try { return JSON.parse(localStorage.getItem("agrimind_weather_city") || "null") || PAKISTAN_CITIES[0]; } catch { return PAKISTAN_CITIES[0]; } });
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [savedChats, setSavedChats] = useState(() => { try { return JSON.parse(localStorage.getItem("agrimind_chats") || "[]"); } catch { return []; } });
  const [archivedChats, setArchivedChats] = useState(() => { try { return JSON.parse(localStorage.getItem("agrimind_archived") || "[]"); } catch { return []; } });
  const [showArchived, setShowArchived] = useState(false);
  const [authFlow, setAuthFlow] = useState("login");
  const [authData, setAuthData] = useState({});
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showWeatherPopup, setShowWeatherPopup] = useState(false);
  const [pestImage, setPestImage] = useState(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const recognitionRef = useRef(null);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Voice input not supported. Use Chrome or Edge."); return; }
    if (isListening && recognitionRef.current) { recognitionRef.current.stop(); setIsListening(false); return; }
    const rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => { let t = ""; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript; setInput(prev => prev ? prev + " " + t : t); };
    rec.onend = () => { setIsListening(false); recognitionRef.current = null; };
    rec.onerror = (e) => { if (e.error !== "no-speech") alert("Voice error: " + e.error); setIsListening(false); recognitionRef.current = null; };
    recognitionRef.current = rec; rec.start(); setIsListening(true);
  };

  useEffect(() => {
    const h = () => { const m = window.innerWidth < 768; setIsMobile(m); if (!m) setSidebarOpen(true); };
    window.addEventListener("resize", h); return () => window.removeEventListener("resize", h);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) setSidebarOpen(s => !s);
    else setSidebarCollapsed(c => !c);
  };

  useEffect(() => {
    const s = () => { if (isForcedAuthRoute()) { localStorage.removeItem(AUTH_USER_KEY); localStorage.removeItem(AUTH_TOKEN_KEY); LEGACY_AUTH_KEYS.forEach(k => localStorage.removeItem(k)); setAuthUser(null); setAuthMode(getInitialAuthMode()); } };
    window.addEventListener("popstate", s); s(); return () => window.removeEventListener("popstate", s);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamText]);

  useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = "auto"; textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px"; } }, [input]);

  const fetchWeather = async (city) => {
    setWeatherLoading(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`);
      const data = await res.json();
      const c = data.current;
      const icons = { 0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",48:"🌫️",51:"🌦️",53:"🌦️",55:"🌦️",61:"🌧️",63:"🌧️",65:"🌧️",71:"❄️",73:"❄️",75:"❄️",77:"❄️",80:"🌦️",81:"🌧️",82:"⛈️",85:"❄️",86:"❄️",95:"⛈️",96:"⛈️",99:"⛈️" };
      const descs = { 0:"Clear",1:"Mainly Clear",2:"Partly Cloudy",3:"Overcast",45:"Foggy",48:"Icy Fog",51:"Light Drizzle",53:"Drizzle",55:"Heavy Drizzle",61:"Light Rain",63:"Rain",65:"Heavy Rain",71:"Light Snow",73:"Snow",75:"Heavy Snow",77:"Snow Grains",80:"Showers",81:"Heavy Showers",82:"Violent Showers",85:"Snow Showers",86:"Heavy Snow Showers",95:"Thunderstorm",96:"Thunderstorm",99:"Thunderstorm" };
      setWeather({ temp: Math.round(c.temperature_2m), humidity: c.relative_humidity_2m, wind: Math.round(c.wind_speed_10m), icon: icons[c.weather_code] || "🌡️", desc: descs[c.weather_code] || "Unknown" });
    } catch { setWeather(null); } finally { setWeatherLoading(false); }
  };

  useEffect(() => { fetchWeather(weatherCity); }, [weatherCity]);
  useEffect(() => { const i = setInterval(() => fetchWeather(weatherCity), 600000); return () => clearInterval(i); }, [weatherCity]);

  const handleOverlayClick = () => { if (isMobile) setSidebarOpen(false); };
  const saveKey = () => setShowKeyModal(false);

  const startSession = (user, token) => {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ id:user.id,name:user.name,email:user.email }));
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    LEGACY_AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    setAuthUser({ id:user.id,name:user.name,email:user.email });
    setAuthError(""); window.history.replaceState(null, "", "/");
  };

  const changeAuthMode = (m) => { setAuthMode(m); setAuthError(""); setAuthFlow(m); setAuthData({}); window.history.pushState(null, "", m==="signup"?"/signup":"/login"); };

  const handleSignup = async ({ name, email, password }) => {
    const cn = name.trim(), ce = email.trim().toLowerCase();
    if (!cn || !ce || !password) { setAuthError("Please fill in all fields."); return; }
    if (cn.length < 2) { setAuthError("Name must be at least 2 characters."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ce)) { setAuthError("Please enter a valid email address."); return; }
    if (password.length < 8) { setAuthError("Password must be at least 8 characters."); return; }
    try {
      setAuthError("Sending verification code...");
      const d = await apiRequest("/api/auth/send-otp", { method:"POST", body:JSON.stringify({email:ce,name:cn,password,purpose:"signup"}) });
      setAuthData({ email:ce, name:cn, password, otpFromServer: d.otp });
      setAuthFlow("otp-signup");
      setAuthError("");
    } catch (e) { setAuthError(e.message || "Failed to send verification code."); }
  };

  const handleOtpVerify = async (otp) => {
    const { email, password, name } = authData;
    try {
      setAuthError("Verifying code...");
      const d = await apiRequest("/api/auth/verify-otp", { method:"POST", body:JSON.stringify({email, otp, purpose:"signup"}) });
      startSession(d.user, d.token);
    } catch (e) { setAuthError(e.message || "Verification failed."); }
  };

  const handleLogin = async ({ email, password, rememberMe }) => {
    const ce = email.trim().toLowerCase();
    if (!ce || !password) { setAuthError("Please enter email and password."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ce)) { setAuthError("Please enter a valid email address."); return; }
    try {
      setAuthError("Logging in...");
      const d = await apiRequest("/api/auth/login", { method:"POST", body:JSON.stringify({email:ce,password}) });
      if (d.requiresTOTP) {
        setAuthData({ tempToken: d.tempToken, user: d.user });
        setAuthFlow("totp");
        setAuthError("");
        return;
      }
      if (!rememberMe) {
        sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(d.user));
        sessionStorage.setItem(AUTH_TOKEN_KEY, d.token);
      }
      startSession(d.user, d.token);
    } catch (e) { setAuthError(e.message || "Login failed."); }
  };

  const handleTotpVerify = async (code) => {
    try {
      setAuthError("Verifying 2FA code...");
      const d = await apiRequest("/api/auth/verify-totp", { method:"POST", body:JSON.stringify({tempToken:authData.tempToken, code}) });
      startSession(d.user, d.token);
    } catch (e) { setAuthError(e.message || "2FA verification failed."); }
  };

  const handleForgotPassword = async (email) => {
    const ce = email.trim().toLowerCase();
    if (!ce) { setAuthError("Please enter your email address."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ce)) { setAuthError("Please enter a valid email address."); return; }
    try {
      setAuthError("Sending reset code...");
      const d = await apiRequest("/api/auth/forgot-password", { method:"POST", body:JSON.stringify({email:ce}) });
      setAuthData({ email:ce, otpFromServer: d.otp });
      setAuthFlow("otp-reset");
      setAuthError("If this email exists, a reset code has been sent. (Dev: check server console)");
    } catch (e) { setAuthError(e.message || "Failed to send reset code."); }
  };

  const handleResetOtp = async (otp) => {
    const { email } = authData;
    try {
      setAuthError("Verifying code...");
      const d = await apiRequest("/api/auth/verify-otp", { method:"POST", body:JSON.stringify({email, otp, purpose:"reset"}) });
      setAuthData({ ...authData, resetToken: d.resetToken });
      setAuthFlow("reset-password");
      setAuthError("");
    } catch (e) { setAuthError(e.message || "Verification failed."); }
  };

  const handleResetPassword = async (newPassword) => {
    const { email, resetToken } = authData;
    if (newPassword.length < 8) { setAuthError("Password must be at least 8 characters."); return; }
    try {
      setAuthError("Resetting password...");
      const d = await apiRequest("/api/auth/reset-password", { method:"POST", body:JSON.stringify({email, password:newPassword, resetToken}) });
      startSession(d.user, d.token);
      setAuthError("");
    } catch (e) { setAuthError(e.message || "Password reset failed."); }
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_USER_KEY); localStorage.removeItem(AUTH_TOKEN_KEY);
    LEGACY_AUTH_KEYS.forEach(k => localStorage.removeItem(k));
    setAuthUser(null); setAuthMode("login"); setAuthError("");
    window.history.pushState(null, "", "/login"); if (isMobile) setSidebarOpen(false);
  };

  const buildSystem = (msgs) => {
    const hasHistory = (msgs || []).filter(m => m.role === "user").length > 1;
    let sys = hasHistory ? SYSTEM_ONGOING : SYSTEM_FIRST;
    const mode = EXPERT_MODES.find(m => m.id === activeMode);
    if (mode) sys += `\n\nACTIVE EXPERT MODE — ${mode.label}:\n${mode.prompt}`;
    const p = farmProfile;
    if (p.location || p.cropType || p.soilType || p.size || p.district || p.latitude) {
      sys += `\n\nFARMER PROFILE:\n- Location: ${p.location||"not set"}\n- District: ${p.district||"not set"}\n- GPS: ${p.latitude&&p.longitude?p.latitude+", "+p.longitude:"not set"}\n- Crops: ${p.cropType||"not set"}\n- Soil: ${p.soilType||"not set"}\n- Size: ${p.size||"not set"}`;
    }
    sys += `\n\nWEATHER LOCATION: ${weatherCity.name}, ${weatherCity.province} (Lat: ${weatherCity.lat}, Lng: ${weatherCity.lng})`;
    return sys;
  };

  const sendMessage = async (text) => {
    const msg = text !== undefined ? text : input.trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }
    if (isMobile) setSidebarOpen(false);

    const msgLower = msg.toLowerCase();
    const hasChatToExport = messages.filter(m => m.role === "user").length > 0;
    const pdfP = [/export.*(pdf|print)/i,/convert.*(pdf|print)/i,/save.*pdf/i,/download.*pdf/i,/generate.*pdf/i,/make.*pdf/i,/chat.*pdf/i,/pdf.*chat/i,/pdf.*export/i,/get.*pdf/i];
    const docxP = [/export.*(docx|word|doc)/i,/convert.*(docx|word|doc)/i,/save.*(docx|word|doc)/i,/download.*(docx|word|doc)/i,/generate.*(docx|word|doc)/i,/make.*(docx|word|doc)/i,/chat.*(docx|word|doc)/i,/(docx|word|doc).*chat/i,/get.*(docx|word|doc)/i];
    const exportP = [/export\s*(this\s*)?(chat|conversation)?$/i,/save\s*(this\s*)?(chat|conversation)/i,/download\s*(this\s*)?(chat|conversation)/i];

    if (hasChatToExport && pdfP.some(p => p.test(msg))) { setInput(""); setMessages(prev => [...prev,{role:"user",content:msg},{role:"assistant",content:"📕 **Generating PDF...**"}]); setTimeout(() => exportToPDF(), 400); return; }
    if (hasChatToExport && docxP.some(p => p.test(msg))) { setInput(""); setMessages(prev => [...prev,{role:"user",content:msg},{role:"assistant",content:"📄 **Downloading Word document...**"}]); setTimeout(() => exportToDocx(), 400); return; }
    if (hasChatToExport && exportP.some(p => p.test(msg))) { setInput(""); setMessages(prev => [...prev,{role:"user",content:msg},{role:"assistant",content:"📤 **Export options:**\n\n- Type **export as PDF**\n- Type **export as Word**"}]); return; }

    const priorUserMsgs = messages.filter(m => m.role === "user").length;
    if (priorUserMsgs === 0 && OFFTOPIC_PATTERNS.some(p => p.test(msg))) { setMessages(prev => [...prev,{role:"user",content:msg},{role:"assistant",content:"🌾🚫🤖"}]); setInput(""); return; }

    const userMsg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(""); setLoading(true); setStreamText("");
    const apiMsgs = newMessages.slice(-14).map(m => ({ role: m.role, content: m.content }));

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({model:selectedModel,system:buildSystem(newMessages),messages:apiMsgs,temperature:0.7,max_tokens:2048}) });
      const full = await readGroqLikeResponse(res, setStreamText);
      setMessages([...newMessages, { role: "assistant", content: full }]); setStreamText("");
    } catch (err) {
      const errMsg = err.message.includes("401") ? "❌ **Session expired.** Please log out and log in again." : err.message.includes("429") ? "⏳ **Rate limit reached.** Please wait a moment." : err.message.includes("GROQ_API_KEY") ? "❌ **Backend API key missing.**" : `❌ **Error:** ${err.message}`;
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]); setStreamText("");
    } finally { setLoading(false); }
  };

  const clearChat = () => {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) { const ns = [...savedChats, { id: Date.now(), title: firstUserMsg.content.slice(0, 42), msgs: messages }].slice(-20); setSavedChats(ns); localStorage.setItem("agrimind_chats", JSON.stringify(ns)); }
    setMessages([{ role: "assistant", content: "🌱 New session started. Ask me anything about farming!" }]); if (isMobile) setSidebarOpen(false);
  };

  const deleteChat = (chatId) => {
    const ns = savedChats.filter(c => c.id !== chatId);
    setSavedChats(ns);
    localStorage.setItem("agrimind_chats", JSON.stringify(ns));
  };

  const archiveChat = (chatId) => {
    const chat = savedChats.find(c => c.id === chatId);
    if (!chat) return;
    const ns = savedChats.filter(c => c.id !== chatId);
    setSavedChats(ns);
    localStorage.setItem("agrimind_chats", JSON.stringify(ns));
    const archived = [...archivedChats, chat].slice(-30);
    setArchivedChats(archived);
    localStorage.setItem("agrimind_archived", JSON.stringify(archived));
  };

  const unarchiveChat = (chatId) => {
    const chat = archivedChats.find(c => c.id === chatId);
    if (!chat) return;
    const na = archivedChats.filter(c => c.id !== chatId);
    setArchivedChats(na);
    localStorage.setItem("agrimind_archived", JSON.stringify(na));
    const restored = [...savedChats, chat].slice(-20);
    setSavedChats(restored);
    localStorage.setItem("agrimind_chats", JSON.stringify(restored));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    if (file.size > 5*1024*1024) { alert("Image must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => { const d = ev.target.result; setPestImage({ dataUrl:d, base64:d.split(",")[1], mimeType:file.type, name:file.name }); };
    reader.readAsDataURL(file); e.target.value = "";
  };

  const sendImageMessage = async () => {
    if (!pestImage || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }
    if (isMobile) setSidebarOpen(false);
    const caption = input.trim() || "Please identify any pests, diseases, or nutrient deficiencies visible in this crop/plant image. Provide: 1) Identification 2) Severity 3) Recommended treatment.";
    const userDisplayMsg = { role: "user", content: `📷 **Image uploaded:** ${pestImage.name}\n\n${caption}` };
    const newMessages = [...messages, userDisplayMsg];
    setMessages(newMessages); setInput(""); setPestImage(null); setLoading(true); setStreamText("");
    const apiMsgs = [...newMessages.slice(-13).slice(0,-1).map(m => ({role:m.role,content:m.content})), {role:"user",content:[{type:"image_url",image_url:{url:`data:${pestImage.mimeType};base64,${pestImage.base64}`}},{type:"text",text:caption}]}];
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const res = await fetch("/api/chat", { method:"POST", headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})}, body:JSON.stringify({model:"openai/gpt-oss-120b",system:buildSystem(newMessages),messages:apiMsgs,temperature:0.6,max_tokens:2048}) });
      const full = await readGroqLikeResponse(res, setStreamText);
      setMessages([...newMessages, { role: "assistant", content: full }]); setStreamText("");
    } catch (err) { setMessages(prev => [...prev, { role: "assistant", content: `❌ **Image analysis error:** ${err.message}` }]); setStreamText(""); }
    finally { setLoading(false); }
  };

  const md = (text) => (text || "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code class="inline-code">$1</code>')
    .replace(/^### (.+)$/gm, '<div class="md-h3">$1</div>')
    .replace(/^## (.+)$/gm, '<div class="md-h2">$1</div>')
    .replace(/^# (.+)$/gm, '<div class="md-h1">$1</div>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="md-ol">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, s => `<ul class="md-list">${s}</ul>`)
    .replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>");

  const stripHtml = (html) => (html||"").replace(/<br\s*\/?>/gi,"\n").replace(/<\/?(div|p|ul|li)[^>]*>/gi,"\n").replace(/<[^>]*>/g,"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ").replace(/\n{3,}/g,"\n\n").trim();

  const buildDocxBlob = (filesMap) => {
    const crcTable = (() => { const t = new Uint32Array(256); for (let i=0;i<256;i++){let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[i]=c;} return t; })();
    const crc32 = (data) => { let c=0xFFFFFFFF; for(let i=0;i<data.length;i++)c=crcTable[(c^data[i])&0xFF]^(c>>>8); return(c^0xFFFFFFFF)>>>0; };
    const enc = new TextEncoder();
    const entries = Object.entries(filesMap).map(([name,content])=>{const nb=enc.encode(name),db=enc.encode(content);return{name,nb,db,crc:crc32(db)};});
    const localParts=[],offsets=[];let offset=0;
    for(const e of entries){offsets.push(offset);const lh=new Uint8Array(30+e.nb.length);const v=new DataView(lh.buffer);v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(8,0,true);v.setUint32(14,e.crc,true);v.setUint32(18,e.db.length,true);v.setUint32(22,e.db.length,true);v.setUint16(26,e.nb.length,true);lh.set(e.nb,30);localParts.push(lh,e.db);offset+=lh.length+e.db.length;}
    const cdParts=[];let cdSize=0;const cdOffset=offset;
    for(let i=0;i<entries.length;i++){const e=entries[i];const cd=new Uint8Array(46+e.nb.length);const v=new DataView(cd.buffer);v.setUint32(0,0x02014b50,true);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint32(16,e.crc,true);v.setUint32(20,e.db.length,true);v.setUint32(24,e.db.length,true);v.setUint16(28,e.nb.length,true);v.setUint32(42,offsets[i],true);cd.set(e.nb,46);cdParts.push(cd);cdSize+=cd.length;}
    const eocd=new Uint8Array(22);const ev=new DataView(eocd.buffer);ev.setUint32(0,0x06054b50,true);ev.setUint16(8,entries.length,true);ev.setUint16(10,entries.length,true);ev.setUint32(12,cdSize,true);ev.setUint32(16,cdOffset,true);
    const all=[...localParts,...cdParts,eocd];const totalLen=all.reduce((s,p)=>s+p.length,0);const result=new Uint8Array(totalLen);let pos=0;for(const p of all){result.set(p,pos);pos+=p.length;}
    return new Blob([result],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
  };

  const exportToDocx = () => {
    setExportLoading(true);
    try {
      const xmlEsc = (s) => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
      const makePara = (text,bold=false,color="1b4332",size="22") => text.split("\n").map(line=>{const esc=xmlEsc(line);return`<w:p><w:pPr><w:spacing w:after="100"/></w:pPr><w:r><w:rPr>${bold?"<w:b/>":""}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${esc}</w:t></w:r></w:p>`;}).join("");
      let paragraphs = makePara("AgriMind - Chat Export",true,"1b4332","32") + makePara(`Exported: ${new Date().toLocaleString()}`,false,"4a7c59","18");
      if(farmProfile.location) paragraphs+=makePara(`Location: ${farmProfile.location}`,false,"4a7c59","18");
      if(farmProfile.district) paragraphs+=makePara(`District: ${farmProfile.district}`,false,"4a7c59","18");
      paragraphs += `<w:p/>`;
      messages.forEach(msg=>{const isAI=msg.role==="assistant";paragraphs+=makePara(isAI?"AgriMind":"Farmer",true,isAI?"1b4332":"2d6a4f","22");paragraphs+=makePara(isAI?stripHtml(md(msg.content)):(msg.content||""),false,"222222","22");paragraphs+=`<w:p/>`;});
      const docXml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body></w:document>`;
      const blob=buildDocxBlob({"[Content_Types].xml":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,"_rels/.rels":`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,"word/document.xml":docXml});
      const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`AgriMind_Chat_${Date.now()}.docx`;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
    } catch(e){alert("DOCX export failed: "+e.message);} finally{setExportLoading(false);setShowExportModal(false);}
  };

  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const pw=window.open("","_blank");
      if(!pw){alert("Allow popups for PDF export.");setExportLoading(false);return;}
      pw.document.open();pw.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"/><title>AgriMind Chat</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',Arial,sans-serif;max-width:800px;margin:0 auto;padding:30px;color:#1b4332}h1{border-bottom:3px solid #40916c;padding-bottom:10px;margin-bottom:6px;font-size:22px}.meta{color:#4a7c59;font-size:12px;margin-bottom:24px;line-height:1.8}.message{margin-bottom:16px;border-radius:10px;overflow:hidden;page-break-inside:avoid}.msg-header{padding:7px 14px;font-weight:700;font-size:12px}.msg-body{padding:11px 15px;font-size:13px;line-height:1.75;white-space:pre-wrap}.assistant .msg-header{background:#1b4332;color:#fff}.assistant .msg-body{background:#f0f7f1;border:1px solid #c3e6cb}.user .msg-header{background:#2d6a4f;color:#fff}.user .msg-body{background:#e8f5eb;border:1px solid #9dd4a8}strong{font-weight:700}ul{padding-left:20px;margin:4px 0}li{margin:2px 0}@media print{body{padding:15px}}</style></head><body><h1>AgriMind Chat Export</h1><div class="meta">Exported: ${new Date().toLocaleString()}<br/>${farmProfile.location?`Location: ${farmProfile.location}<br/>`:""}${farmProfile.district?`District: ${farmProfile.district}`:""}</div>${messages.map(msg=>`<div class="message ${msg.role}"><div class="msg-header">${msg.role==="assistant"?"AgriMind":"Farmer"}</div><div class="msg-body">${md(msg.content)}</div></div>`).join("")}</body></html>`);
      pw.document.close();setTimeout(()=>{pw.focus();pw.print();},800);
    } catch(e){alert("PDF export failed: "+e.message);} finally{setExportLoading(false);setShowExportModal(false);}
  };

  const activeModeObj = EXPERT_MODES.find(m => m.id === activeMode);

  if (!authUser) return <AuthScreen flow={authFlow} setFlow={setAuthFlow} authData={authData} setAuthData={setAuthData} error={authError} onModeChange={changeAuthMode} onLogin={handleLogin} onSignup={handleSignup} onOtpVerify={handleOtpVerify} onTotpVerify={handleTotpVerify} onForgotPassword={handleForgotPassword} onResetOtp={handleResetOtp} onResetPassword={handleResetPassword} />;

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className={`app-root ${darkMode ? "dark" : "light"}`}>
        {showWeatherPopup && !isMobile && <div className="modal-overlay" style={{zIndex:199}} onClick={() => setShowWeatherPopup(false)} />}

        {/* ── API Key Modal ── */}
        {showKeyModal && (
          <div className="modal-overlay" style={{zIndex:1000}}>
            <div className="modal-card modal-enter">
              <div className="modal-icon">🌾</div>
              <h2 className="modal-title">AgriMind</h2>
              <p className="modal-sub">Powered by Backend + Groq</p>
              <div className="modal-info-box">Add <strong>GROQ_API_KEY</strong> in your backend .env</div>
              <input type="password" className="modal-input" placeholder="gsk_xxxxxxxxxxxxxxxx" value={keyInput} onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveKey()} autoFocus />
              <button className="modal-btn-primary" onClick={saveKey} disabled={!keyInput.trim()}>Start AgriMind</button>
              <p className="modal-footer-text">API key is never exposed in browser</p>
            </div>
          </div>
        )}

        {/* ── Farm Profile Modal ── */}
        {showProfile && (
          <div className="modal-overlay" style={{zIndex:999}}>
            <div className="modal-card modal-enter" style={{maxWidth:400}}>
              <h3 className="modal-section-title">🌿 Your Farm Profile</h3>
              <p className="modal-section-sub">Helps AgriMind give personalized advice.</p>
              <div className="form-group">
                <label className="form-label">📍 Location / City</label>
                <input className="form-input" value={farmProfile.location} onChange={e => setFarmProfile(p => ({...p,location:e.target.value}))} placeholder="e.g. Multan, Punjab" />
              </div>
              <div className="form-group">
                <label className="form-label">🗺️ District</label>
                <select className="form-input" value={farmProfile.district} onChange={e => setFarmProfile(p => ({...p,district:e.target.value}))}>
                  <option value="">Select District</option>
                  {PAKISTAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">🌐 GPS Coordinates</label>
                <div style={{display:"flex",gap:8}}>
                  <input className="form-input" style={{flex:1}} value={farmProfile.latitude} onChange={e => setFarmProfile(p => ({...p,latitude:e.target.value}))} placeholder="Latitude" />
                  <input className="form-input" style={{flex:1}} value={farmProfile.longitude} onChange={e => setFarmProfile(p => ({...p,longitude:e.target.value}))} placeholder="Longitude" />
                </div>
                <button className="link-btn" onClick={() => navigator.geolocation?.getCurrentPosition(pos => setFarmProfile(p => ({...p,latitude:pos.coords.latitude.toFixed(6),longitude:pos.coords.longitude.toFixed(6)})), () => alert("Location denied."))}>📡 Use My Current Location</button>
              </div>
              {[["cropType","🌾 Current Crops","e.g. Wheat, Cotton"],["soilType","🪨 Soil Type","e.g. Sandy Loam"],["size","📐 Farm Size","e.g. 10 acres"]].map(([key,label,ph])=>(
                <div className="form-group" key={key}><label className="form-label">{label}</label><input className="form-input" value={farmProfile[key]} onChange={e=>setFarmProfile(p=>({...p,[key]:e.target.value}))} placeholder={ph}/></div>
              ))}
              <div style={{display:"flex",gap:10,marginTop:8}}>
                <button className="modal-btn-primary" style={{flex:1}} onClick={()=>setShowProfile(false)}>Save Profile</button>
                <button className="modal-btn-secondary" onClick={()=>setShowProfile(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* ── Weather City Modal ── */}
        {showWeatherCity && (
          <div className="modal-overlay" style={{zIndex:999}}>
            <div className="modal-card modal-enter" style={{maxWidth:380,maxHeight:"85dvh",overflowY:"auto"}}>
              <h3 className="modal-section-title">🌦️ Weather Monitoring City</h3>
              <p className="modal-section-sub">Select city for weather-based crop advice.</p>
              <div className="city-list">
                {Object.entries(PAKISTAN_CITIES.reduce((a,c)=>{(a[c.province]=a[c.province]||[]).push(c);return a;},{})).map(([prov,cities])=>(
                  <div key={prov}>
                    <div className="city-province">{prov}</div>
                    {cities.map(city=>(
                      <button key={city.name} className={`city-btn ${weatherCity.name===city.name?"active":""}`} onClick={()=>{setWeatherCity(city);localStorage.setItem("agrimind_weather_city",JSON.stringify(city));setShowWeatherCity(false);}}>
                        <span>{city.name}</span><span className="city-coords">{city.lat.toFixed(2)}, {city.lng.toFixed(2)}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
              <button className="modal-btn-secondary" style={{marginTop:14}} onClick={()=>setShowWeatherCity(false)}>Close</button>
            </div>
          </div>
        )}

        {/* ── Export Modal ── */}
        {showExportModal && (
          <div className="modal-overlay" style={{zIndex:999}}>
            <div className="modal-card modal-enter" style={{maxWidth:360}}>
              <h3 className="modal-section-title" style={{fontSize:17}}>📤 Export Chat</h3>
              <p className="modal-section-sub">Save your conversation as a document.</p>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <button className="export-btn export-docx" onClick={exportToDocx} disabled={exportLoading}>
                  <span className="export-icon">📄</span>
                  <div><div>Download as Word (.docx)</div><div className="export-desc">Opens in Microsoft Word, Google Docs</div></div>
                </button>
                <button className="export-btn export-pdf" onClick={exportToPDF} disabled={exportLoading}>
                  <span className="export-icon">📕</span>
                  <div><div>Download as PDF</div><div className="export-desc">Print-ready format via browser</div></div>
                </button>
              </div>
              <button className="modal-btn-secondary" style={{marginTop:14}} onClick={()=>setShowExportModal(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* ── Expert Mode Bottom Sheet (mobile) ── */}
        {showModeSheet && isMobile && (
          <div className="bottom-sheet-backdrop" style={{zIndex:998}}>
            <div className="bottom-sheet-overlay" onClick={()=>setShowModeSheet(false)} />
            <div className="bottom-sheet sheet-enter">
              <div className="bottom-sheet-handle" />
              <div className="bottom-sheet-title">Expert Modes</div>
              <div className="mode-grid">
                {EXPERT_MODES.map(mode=>(
                  <button key={mode.id} className={`mode-card ${activeMode===mode.id?"active":""}`} onClick={()=>{setActiveMode(activeMode===mode.id?null:mode.id);setShowModeSheet(false);}}>
                    <span className="mode-icon">{mode.icon}</span>
                    <div><div className="mode-label">{mode.label}</div><div className="mode-desc">{mode.desc}</div></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {isMobile && sidebarOpen && <div className="sidebar-overlay" onClick={handleOverlayClick} />}

        {/* ── Sidebar ── */}
        <aside className={`sidebar ${isMobile?(sidebarOpen?"open":"closed"):(sidebarCollapsed?"collapsed":"expanded")} ${isMobile?"mobile":"desktop"}`}>
          <div className="sidebar-header">
            {!sidebarCollapsed && (
              <div className="sidebar-brand">
                <div className="sidebar-logo">🌾</div>
                <div className="sidebar-brand-text"><div className="sidebar-name">AgriMind</div><div className="sidebar-tagline">Free AI Farm Advisor</div></div>
              </div>
            )}
            {sidebarCollapsed && <div className="sidebar-logo" style={{margin:"0 auto"}}>🌾</div>}
            {isMobile && !sidebarCollapsed && <button className="icon-btn" onClick={()=>setSidebarOpen(false)}>✕</button>}
            {!isMobile && <button className="sidebar-toggle-btn" onClick={toggleSidebar} title={sidebarCollapsed?"Expand sidebar":"Collapse sidebar"}>{sidebarCollapsed?"▶":"◀"}</button>}
          </div>

          <div className={`sidebar-section ${sidebarCollapsed?"collapsed-section":""}`}>
            {!sidebarCollapsed && <label className="sidebar-label">AI Model</label>}
            <select className={`sidebar-select ${sidebarCollapsed?"collapsed-select":""}`} value={selectedModel} onChange={e=>setSelectedModel(e.target.value)} title={sidebarCollapsed?`${GROQ_MODELS.find(m=>m.id===selectedModel)?.label} — ${GROQ_MODELS.find(m=>m.id===selectedModel)?.desc}`:""}>
              {GROQ_MODELS.map(m=><option key={m.id} value={m.id}>{sidebarCollapsed?m.label.split(" ")[0]:`${m.label} — ${m.desc}`}</option>)}
            </select>
          </div>

          <div className={`sidebar-section ${sidebarCollapsed?"collapsed-section":""}`}>
            <button className={`new-chat-btn ${sidebarCollapsed?"collapsed-new-chat":""}`} onClick={clearChat} title="New Chat">
              {sidebarCollapsed?"✏️":"✏️ New Chat"}
            </button>
          </div>

          <div className={`sidebar-section sidebar-modes ${sidebarCollapsed?"collapsed-section":""}`}>
            {!sidebarCollapsed && <div className="sidebar-label">Expert Modes</div>}
            {EXPERT_MODES.map(mode=>(
              <button key={mode.id} className={`sidebar-mode-btn ${activeMode===mode.id?"active":""} ${sidebarCollapsed?"collapsed-mode-btn":""}`} onClick={()=>{setActiveMode(activeMode===mode.id?null:mode.id);if(isMobile)setSidebarOpen(false);}} title={`${mode.label} — ${mode.desc}`}>
                <span className="sidebar-mode-icon">{mode.icon}</span>
                {!sidebarCollapsed && <div className="sidebar-mode-text"><div className="sidebar-mode-name">{mode.label}</div><div className="sidebar-mode-desc">{mode.desc}</div></div>}
              </button>
            ))}
          </div>

          {!sidebarCollapsed && (savedChats.length > 0 || archivedChats.length > 0) && (
            <div className="sidebar-section sidebar-chats">
              {savedChats.length > 0 && (
                <>
                  <div className="sidebar-label">Recent Chats</div>
                  {savedChats.slice(-8).reverse().map(chat=>(
                    <div key={chat.id} className="sidebar-chat-row">
                      <button className="sidebar-chat-btn" onClick={()=>{setMessages(chat.msgs);if(isMobile)setSidebarOpen(false);}}>
                        💬 {chat.title}
                      </button>
                      <div className="sidebar-chat-actions">
                        <button className="chat-action-btn archive-btn" title="Archive" onClick={()=>archiveChat(chat.id)}>📦</button>
                        <button className="chat-action-btn delete-btn" title="Delete" onClick={()=>deleteChat(chat.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
              {archivedChats.length > 0 && (
                <>
                  <button className="sidebar-archive-toggle" onClick={()=>setShowArchived(s=>!s)}>
                    📂 Archived ({archivedChats.length}) {showArchived?"▾":"▸"}
                  </button>
                  {showArchived && archivedChats.slice(-10).reverse().map(chat=>(
                    <div key={chat.id} className="sidebar-chat-row archived">
                      <button className="sidebar-chat-btn" onClick={()=>{setMessages(chat.msgs);if(isMobile)setSidebarOpen(false);}}>
                        📁 {chat.title}
                      </button>
                      <div className="sidebar-chat-actions">
                        <button className="chat-action-btn restore-btn" title="Restore" onClick={()=>unarchiveChat(chat.id)}>♻️</button>
                        <button className="chat-action-btn delete-btn" title="Delete" onClick={()=>{const na=archivedChats.filter(c=>c.id!==chat.id);setArchivedChats(na);localStorage.setItem("agrimind_archived",JSON.stringify(na));}}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div className={`sidebar-footer ${sidebarCollapsed?"collapsed-footer":""}`}>
            {!sidebarCollapsed && (
              <div className="sidebar-user-card">
                <div className="sidebar-user-name">👤 {authUser.name}</div>
                <div className="sidebar-user-email">{authUser.email}</div>
              </div>
            )}
            {sidebarCollapsed && <div className="sidebar-user-avatar" title={authUser.name}>👤</div>}
            <button className={`sidebar-footer-btn ${sidebarCollapsed?"collapsed-footer-btn":""}`} onClick={handleLogout} title="Logout">
              🚪 {!sidebarCollapsed && "Logout"}
            </button>
            <button className={`sidebar-footer-btn ${sidebarCollapsed?"collapsed-footer-btn":""}`} onClick={()=>{setShowProfile(true);if(isMobile)setSidebarOpen(false);}} title="Farm Profile">
              🌿 {!sidebarCollapsed && "Farm Profile"}
            </button>
            <button className={`sidebar-footer-btn ${sidebarCollapsed?"collapsed-footer-btn":""}`} onClick={()=>{setShowWeatherCity(true);if(isMobile)setSidebarOpen(false);}} title="Weather City">
              🌦️ {!sidebarCollapsed && "Weather City"}
            </button>
            <button className={`sidebar-footer-btn ${sidebarCollapsed?"collapsed-footer-btn":""}`} onClick={()=>setDarkMode(!darkMode)} title={darkMode?"Light Mode":"Dark Mode"}>
              {darkMode?"☀️":"🌙"} {!sidebarCollapsed && (darkMode?"Light Mode":"Dark Mode")}
            </button>
            <button className={`sidebar-footer-btn ${sidebarCollapsed?"collapsed-footer-btn":""}`} onClick={()=>{setShowExportModal(true);if(isMobile)setSidebarOpen(false);}} disabled={messages.filter(m=>m.role==="user").length===0} title="Export Chat" style={{opacity:messages.filter(m=>m.role==="user").length===0?0.4:1}}>
              📤 {!sidebarCollapsed && "Export Chat"}
            </button>
          </div>
        </aside>

        {/* ── Main Chat ── */}
        <main className="chat-main">
          <Particles dark={darkMode} />

          {/* Header */}
          {isMobile ? (
            <header className="chat-header mobile-header">
              <div className="header-row">
                <button className="icon-btn header-menu" onClick={()=>setSidebarOpen(s=>!s)}>☰</button>
                <div className="header-title-wrap">
                  <div className="header-title">{activeModeObj?`${activeModeObj.icon} ${activeModeObj.label}`:"🌾 AgriMind"}</div>
                </div>
                <button className="header-weather-btn" onClick={()=>setShowWeatherPopup(p=>!p)}>
                  <span>{weatherLoading?"⏳":weather?weather.icon:"🌡️"}</span>
                  {weather&&!weatherLoading&&<span className="header-weather-temp">{weather.temp}°C</span>}
                </button>
                <button className="header-avatar" onClick={()=>setShowProfile(true)}>👨‍🌾</button>
                {messages.filter(m=>m.role==="user").length>0&&<button className="header-avatar" onClick={()=>setShowExportModal(true)} title="Export">📤</button>}
              </div>
              <div className="header-row">
                <button className="header-mode-pill" onClick={()=>setShowModeSheet(true)}>
                  <span>{activeModeObj?activeModeObj.icon:"🔧"}</span>
                  <span className="header-mode-text">{activeModeObj?activeModeObj.label:"Select Expert Mode"}</span>
                  <span className="header-mode-arrow">▾</span>
                </button>
                {activeModeObj&&<button className="header-clear-mode" onClick={()=>setActiveMode(null)}>✕</button>}
                {loading&&<div className="header-loading"><Dots /> Thinking</div>}
              </div>
            </header>
          ) : (
            <header className="chat-header desktop-header">
              <button className="icon-btn header-menu" onClick={()=>setSidebarOpen(s=>!s)}>☰</button>
              <div className="header-title-wrap" style={{flex:1}}>
                <div className="header-title">{activeModeObj?`${activeModeObj.icon} ${activeModeObj.label}`:"🌾 AgriMind"}</div>
                <div className="header-subtitle">{activeModeObj?activeModeObj.desc:`Groq + ${GROQ_MODELS.find(m=>m.id===selectedModel)?.label}`}</div>
              </div>
              <div className="header-weather-wrap">
                <button className="header-weather-btn" onClick={()=>setShowWeatherPopup(p=>!p)}>
                  {weatherLoading?"⏳":weather?(
                    <>
                      <span className="header-weather-icon">{weather.icon}</span>
                      <div><div className="header-weather-temp">{weather.temp}°C</div><div className="header-weather-city">{weatherCity.name}</div></div>
                      <div className="header-weather-details"><div>💧{weather.humidity}%</div><div>💨{weather.wind}km/h</div></div>
                    </>
                  ):<span>🌡️</span>}
                  <span className="header-mode-arrow">▾</span>
                </button>
                {showWeatherPopup&&(
                  <div className="weather-popup popup-enter">
                    <div className="weather-popup-header">
                      <div><div className="weather-popup-city">📍 {weatherCity.name}</div><div className="weather-popup-province">{weatherCity.province}</div></div>
                      <button className="weather-refresh-btn" onClick={()=>fetchWeather(weatherCity)}>🔄 Refresh</button>
                    </div>
                    {weather&&(
                      <div className="weather-popup-main">
                        <span className="weather-popup-big-icon">{weather.icon}</span>
                        <div><div className="weather-popup-temp">{weather.temp}°C</div><div className="weather-popup-desc">{weather.desc}</div></div>
                        <div className="weather-popup-stats"><div>💧 {weather.humidity}% Humidity</div><div>💨 {weather.wind} km/h Wind</div></div>
                      </div>
                    )}
                    <div className="weather-popup-cities">
                      <div className="sidebar-label">Change City</div>
                      <div className="weather-city-scroll">
                        {Object.entries(PAKISTAN_CITIES.reduce((a,c)=>{(a[c.province]=a[c.province]||[]).push(c);return a;},{})).map(([prov,cities])=>(
                          <div key={prov}>
                            <div className="city-province">{prov}</div>
                            {cities.map(city=>(
                              <button key={city.name} className={`city-btn mini ${weatherCity.name===city.name?"active":""}`} onClick={()=>{setWeatherCity(city);localStorage.setItem("agrimind_weather_city",JSON.stringify(city));setShowWeatherPopup(false);}}>
                                <span>{city.name}</span>{weatherCity.name===city.name&&<span>✓</span>}
                              </button>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div style={{padding:"8px 12px 12px"}}><button className="modal-btn-secondary" onClick={()=>setShowWeatherPopup(false)}>Close</button></div>
                  </div>
                )}
              </div>
              <button className="header-avatar" onClick={()=>setShowProfile(true)}>👨‍🌾</button>
              {activeModeObj&&<button className="header-clear-mode" onClick={()=>setActiveMode(null)}>✕</button>}
              {messages.filter(m=>m.role==="user").length>0&&<button className="header-action-btn" onClick={()=>setShowExportModal(true)}>📤 Export</button>}
              {loading&&<div className="header-loading"><Dots /> Thinking</div>}
            </header>
          )}

          {/* Mobile weather popup */}
          {isMobile&&showWeatherPopup&&(
            <div className="modal-overlay" style={{zIndex:500,alignItems:"flex-start",paddingTop:90}}>
              <div className="weather-popup mobile popup-enter" onClick={e=>e.stopPropagation()}>
                <div className="weather-popup-header">
                  <div><div className="weather-popup-city">📍 {weatherCity.name}</div><div className="weather-popup-province">{weatherCity.province}</div></div>
                  <div style={{display:"flex",gap:6}}>
                    <button className="weather-refresh-btn" onClick={()=>fetchWeather(weatherCity)}>🔄</button>
                    <button className="weather-refresh-btn" onClick={()=>setShowWeatherPopup(false)}>✕</button>
                  </div>
                </div>
                {weather&&(
                  <div className="weather-popup-main">
                    <span className="weather-popup-big-icon">{weather.icon}</span>
                    <div><div className="weather-popup-temp">{weather.temp}°C</div><div className="weather-popup-desc">{weather.desc}</div></div>
                    <div className="weather-popup-stats"><div>💧 {weather.humidity}%</div><div>💨 {weather.wind} km/h</div></div>
                  </div>
                )}
                <div className="weather-popup-cities">
                  <div className="sidebar-label">Change City</div>
                  <div className="weather-city-scroll">
                    {Object.entries(PAKISTAN_CITIES.reduce((a,c)=>{(a[c.province]=a[c.province]||[]).push(c);return a;},{})).map(([prov,cities])=>(
                      <div key={prov}>
                        <div className="city-province">{prov}</div>
                        {cities.map(city=>(
                          <button key={city.name} className={`city-btn ${weatherCity.name===city.name?"active":""}`} onClick={()=>{setWeatherCity(city);localStorage.setItem("agrimind_weather_city",JSON.stringify(city));setShowWeatherPopup(false);}}>
                            <span>{city.name}</span>{weatherCity.name===city.name&&<span>✓</span>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{padding:"8px 14px 14px"}}><button className="modal-btn-secondary" onClick={()=>setShowWeatherPopup(false)}>Close</button></div>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="messages-container">
            {messages.map((msg, i) => (
              <div key={i} className={`message-row ${msg.role==="user"?"user":"assistant"} msg-enter`} style={{animationDelay:`${Math.min(i*0.05,0.3)}s`}}>
                {msg.role==="assistant"&&<div className="avatar assistant-avatar">🌾</div>}
                <div className={`message-bubble ${msg.role==="user"?"user-bubble":"ai-bubble"}`}>
                  <div dangerouslySetInnerHTML={{ __html: md(msg.content) }} />
                </div>
                {msg.role==="user"&&<div className="avatar user-avatar">👨‍🌾</div>}
              </div>
            ))}
            {(loading&&streamText)&&(
              <div className="message-row assistant msg-enter">
                <div className="avatar assistant-avatar">🌾</div>
                <div className="message-bubble ai-bubble streaming">
                  <div dangerouslySetInnerHTML={{ __html: md(streamText) }} />
                  <span className="typing-cursor" />
                </div>
              </div>
            )}
            {(loading&&!streamText)&&(
              <div className="message-row assistant msg-enter">
                <div className="avatar assistant-avatar">🌾</div>
                <div className="message-bubble ai-bubble"><Dots /></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick chips */}
          {messages.length<=2&&(
            <div className="quick-chips">
              {QUICK_CHIPS.map(chip=>(
                <button key={chip} className="chip" onClick={()=>sendMessage(chip)}>{chip}</button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="input-area">
            {pestImage&&(
              <div className="image-preview">
                <img src={pestImage.dataUrl} alt="uploaded" className="image-preview-thumb" />
                <div className="image-preview-info">
                  <div className="image-preview-title">📷 Image ready for analysis</div>
                  <div className="image-preview-name">{pestImage.name}</div>
                </div>
                <button className="image-preview-remove" onClick={()=>setPestImage(null)}>✕</button>
              </div>
            )}
            <div className="input-container">
              <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} />
              <button className="input-icon-btn" onClick={()=>imageInputRef.current?.click()} title="Upload image" style={{background:pestImage?"var(--accent)":"var(--chip)",color:pestImage?"#fff":"var(--muted)"}}>📷</button>
              <button className={`input-icon-btn voice-btn ${isListening?"listening":""}`} onClick={toggleVoice} title={isListening?"Stop listening":"Voice input"}>🎤</button>
              <textarea ref={textareaRef} value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!isMobile){e.preventDefault();pestImage?sendImageMessage():sendMessage();}}}
                rows={1}
                placeholder={pestImage?"Describe or press ⬆ to analyze...":activeModeObj?`Ask ${activeModeObj.label}...`:"Ask about crops, diseases, pests... 🌱"}
                className="input-textarea" />
              <button className="send-btn" onClick={()=>pestImage?sendImageMessage():sendMessage()} disabled={loading||(!input.trim()&&!pestImage)}>
                {loading?<span className="send-spinner">⏳</span>:"⬆️"}
              </button>
            </div>
            <div className="input-footer">AgriMind • Groq • English, اردو, سنڌي • 📷 Pest ID • 🎤 Voice</div>
          </div>
        </main>
      </div>
    </>
  );
}

/* ── Auth Screen ── */
function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = { length: password.length >= 8, uppercase: /[A-Z]/.test(password), lowercase: /[a-z]/.test(password), number: /[0-9]/.test(password), special: /[^A-Za-z0-9]/.test(password) };
  const score = Object.values(checks).filter(Boolean).length;
  const labels = ["", "Weak", "Weak", "Fair", "Strong", "Very Strong"];
  const colors = ["", "#ef4444", "#ef4444", "#f59e0b", "#22c55e", "#16a34a"];
  return (
    <div style={{marginTop:6}}>
      <div style={{display:"flex",gap:3,marginBottom:4}}>
        {[1,2,3,4,5].map(i=><div key={i} style={{flex:1,height:4,borderRadius:2,background:i<=score?colors[score]:"#e5e7eb",transition:"background 0.3s"}}/>)}
      </div>
      <div style={{fontSize:11,color:colors[score],fontWeight:600}}>{labels[score]}</div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
        {[
          {ok:checks.length,label:"8+ chars"},
          {ok:checks.uppercase,label:"A-Z"},
          {ok:checks.lowercase,label:"a-z"},
          {ok:checks.number,label:"0-9"},
          {ok:checks.special,label:"!@#$"}
        ].map(c=><span key={c.label} style={{fontSize:10,padding:"2px 6px",borderRadius:4,background:c.ok?"#dcfce7":"#f1f5f9",color:c.ok?"#16a34a":"#94a3b8",fontWeight:600,transition:"all 0.2s"}}>{c.ok?"✓":""}{c.label}</span>)}
      </div>
    </div>
  );
}

function OtpInput({ length=6, onComplete, onChange }) {
  const [digits, setDigits] = useState(Array(length).fill(""));
  const refs = useRef([]);
  const handleChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const nd = [...digits];
    nd[i] = val.slice(-1);
    setDigits(nd);
    onChange?.(nd.join(""));
    if (val && i < length-1) refs.current[i+1]?.focus();
    if (nd.every(d=>d) && nd.join("").length === length) onComplete?.(nd.join(""));
  };
  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !digits[i] && i > 0) { refs.current[i-1]?.focus(); const nd=[...digits]; nd[i-1]=""; setDigits(nd); onChange?.(nd.join("")); }
    if (e.key === "ArrowLeft" && i > 0) refs.current[i-1]?.focus();
    if (e.key === "ArrowRight" && i < length-1) refs.current[i+1]?.focus();
  };
  const handlePaste = (e) => {
    const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const nd = text.split("").concat(Array(length).fill("")).slice(0, length);
    setDigits(nd);
    onChange?.(nd.join(""));
    const nextEmpty = nd.findIndex(d => !d);
    refs.current[nextEmpty === -1 ? length-1 : nextEmpty]?.focus();
    if (nd.every(d => d)) onComplete?.(nd.join(""));
  };
  return (
    <div style={{display:"flex",gap:8,justifyContent:"center",padding:"8px 0"}}>
      {digits.map((d,i)=>(
        <input key={i} ref={el=>refs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e=>handleChange(i,e.target.value)} onKeyDown={e=>handleKey(i,e)} onPaste={handlePaste}
          style={{width:48,height:56,borderRadius:12,border:"2px solid var(--input-border)",background:"var(--input-bg)",color:"var(--text)",fontSize:24,textAlign:"center",fontWeight:700,outline:"none",transition:"border-color 0.2s",caretColor:"transparent"}}
          onFocus={e=>e.target.style.borderColor="var(--accent)"} onBlur={e=>e.target.style.borderColor="var(--input-border)"}
        />
      ))}
    </div>
  );
}

function AuthScreen({ flow, setFlow, authData, setAuthData, error, onModeChange, onLogin, onSignup, onOtpVerify, onTotpVerify, onForgotPassword, onResetOtp, onResetPassword }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [otpValue, setOtpValue] = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  useEffect(() => {
    setResendTimer(0);
    setOtpValue("");
    setPassword("");
  }, [flow]);

  const handleSubmit = (e) => { e.preventDefault(); };
  const loginSubmit = (e) => { e.preventDefault(); onLogin({ email, password, rememberMe }); };
  const signupSubmit = (e) => { e.preventDefault(); onSignup({ name, email, password }); };

  const handleResend = () => {
    if (flow === "otp-signup") {
      onSignup({ name: authData.name, email: authData.email, password: authData.password });
      setResendTimer(60);
    } else if (flow === "otp-reset") {
      onForgotPassword(authData.email);
      setResendTimer(60);
    }
  };

  const isSignup = flow === "signup";
  const isLogin = flow === "login";
  const isOtpSignup = flow === "otp-signup";
  const isTotp = flow === "totp";
  const isForgot = flow === "forgot";
  const isOtpReset = flow === "otp-reset";
  const isResetPassword = flow === "reset-password";

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="auth-root">
        <Particles dark={true} />
        <div className="auth-bg-grid" />
        <div className="auth-card auth-enter" style={{maxWidth: isOtpSignup||isTotp||isOtpReset||isResetPassword ? "460px" : "430px"}}>

          {/* Login */}
          {isLogin && (
            <div className="auth-logo-wrap">
              <div className="auth-logo">🌾</div>
              <h1 className="auth-title">AgriMind</h1>
              <p className="auth-sub">AI Agriculture Advisor for farmers and students</p>
            </div>
          )}

          {/* Signup */}
          {isSignup && (
            <div className="auth-logo-wrap">
              <div className="auth-logo">🌾</div>
              <h1 className="auth-title">AgriMind</h1>
              <p className="auth-sub">AI Agriculture Advisor for farmers and students</p>
            </div>
          )}

          {/* OTP / TOTP / Forgot / Reset */}
          {(isOtpSignup || isTotp || isForgot || isOtpReset || isResetPassword) && (
            <div className="auth-logo-wrap">
              <div className="auth-logo" style={{fontSize:36}}>{isOtpSignup?"📧":isTotp?"🔐":isForgot?"🔑":isOtpReset?"📬":"🔄"}</div>
              <h1 className="auth-title" style={{fontSize:22}}>{isOtpSignup?"Verify Your Email":isTotp?"Two-Factor Auth":isForgot?"Reset Password":isOtpReset?"Enter Reset Code":"New Password"}</h1>
              <p className="auth-sub">{isOtpSignup?`We sent a 6-digit code to ${authData.email}`:isTotp?"Enter code from your authenticator app":isForgot?"Enter your email to receive a reset code":isOtpReset?`Enter the code sent to ${authData.email}`:"Create a strong new password"}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">

            {/* Tabs - only on login/signup */}
            {(isLogin || isSignup) && (
              <div className="auth-tabs">
                <button type="button" className={`auth-tab ${isLogin?"active":""}`} onClick={()=>onModeChange("login")}>Login</button>
                <button type="button" className={`auth-tab ${isSignup?"active":""}`} onClick={()=>onModeChange("signup")}>Sign Up</button>
              </div>
            )}

            {/* ── Login Form ── */}
            {isLogin && (
              <>
                <h2 className="auth-form-title">Welcome back</h2>
                <p className="auth-form-sub">Login to open your agriculture assistant.</p>
                <div className="form-group"><label className="form-label">Email</label>
                  <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
                <div className="form-group"><label className="form-label">Password</label>
                  <div style={{position:"relative"}}>
                    <input className="form-input" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" style={{paddingRight:40}} />
                    <button type="button" onClick={()=>setShowPassword(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,opacity:0.5}}>{showPassword?"👁️":"👁️‍🗨️"}</button>
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"var(--muted)",cursor:"pointer"}}>
                    <input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} style={{accentColor:"var(--accent)"}} /> Remember me
                  </label>
                  <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={()=>{setFlow("forgot");setAuthData({...authData,email})}}>Forgot password?</button>
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button type="submit" className="auth-submit" onClick={loginSubmit}>Login 🚀</button>
              </>
            )}

            {/* ── Signup Form ── */}
            {isSignup && (
              <>
                <h2 className="auth-form-title">Create your account</h2>
                <p className="auth-form-sub">Sign up to start using AgriMind.</p>
                <div className="form-group"><label className="form-label">Full Name</label>
                  <input className="form-input" value={name} onChange={e=>setName(e.target.value)} placeholder="John Doe" autoComplete="name" maxLength={50} />
                  {name.length > 0 && name.length < 2 && <div style={{fontSize:11,color:"#ef4444",marginTop:4}}>Name must be at least 2 characters</div>}
                </div>
                <div className="form-group"><label className="form-label">Email</label>
                  <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
                <div className="form-group"><label className="form-label">Password</label>
                  <div style={{position:"relative"}}>
                    <input className="form-input" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a strong password" autoComplete="new-password" style={{paddingRight:40}} />
                    <button type="button" onClick={()=>setShowPassword(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,opacity:0.5}}>{showPassword?"👁️":"👁️‍🗨️"}</button>
                  </div>
                  <PasswordStrength password={password} />
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button type="submit" className="auth-submit" onClick={signupSubmit}>Create Account 🚀</button>
              </>
            )}

            {/* ── OTP Verification (Signup) ── */}
            {isOtpSignup && (
              <>
                <h2 className="auth-form-title">Check your inbox</h2>
                <p className="auth-form-sub">Enter the 6-digit code sent to <strong>{authData.email}</strong></p>
                <OtpInput length={6} onComplete={(v)=>{setOtpValue(v);onOtpVerify(v)}} onChange={setOtpValue} />
                {error && <div className="auth-error">{error}</div>}
                <button type="button" className="auth-submit" onClick={()=>onOtpVerify(otpValue)} disabled={otpValue.length!==6} style={{opacity:otpValue.length!==6?0.5:1}}>Verify Email 📧</button>
                <div style={{textAlign:"center",marginTop:12}}>
                  <span style={{fontSize:12,color:"var(--muted)"}}>Didn't receive it? </span>
                  {resendTimer > 0 ? <span style={{fontSize:12,color:"var(--muted)"}}>Resend in {resendTimer}s</span> :
                    <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={handleResend}>Resend code</button>}
                </div>
                <div style={{textAlign:"center",marginTop:8}}>
                  <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={()=>setFlow("signup")}>← Back to signup</button>
                </div>
              </>
            )}

            {/* ── TOTP Verification (2FA) ── */}
            {isTotp && (
              <>
                <h2 className="auth-form-title">Enter 2FA Code</h2>
                <p className="auth-form-sub">Open your authenticator app and enter the 6-digit code</p>
                <OtpInput length={6} onComplete={(v)=>{setOtpValue(v);onTotpVerify(v)}} onChange={setOtpValue} />
                {error && <div className="auth-error">{error}</div>}
                <button type="button" className="auth-submit" onClick={()=>onTotpVerify(otpValue)} disabled={otpValue.length!==6} style={{opacity:otpValue.length!==6?0.5:1}}>Verify 🔐</button>
                <div style={{textAlign:"center",marginTop:8}}>
                  <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={()=>setFlow("login")}>← Back to login</button>
                </div>
              </>
            )}

            {/* ── Forgot Password (email entry) ── */}
            {isForgot && (
              <>
                <h2 className="auth-form-title">Forgot Password?</h2>
                <p className="auth-form-sub">Enter your email and we'll send you a reset code.</p>
                <div className="form-group"><label className="form-label">Email</label>
                  <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" /></div>
                {error && <div className="auth-error">{error}</div>}
                <button type="button" className="auth-submit" onClick={()=>onForgotPassword(email)}>Send Reset Code 🔑</button>
                <div style={{textAlign:"center",marginTop:12}}>
                  <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={()=>setFlow("login")}>← Back to login</button>
                </div>
              </>
            )}

            {/* ── OTP Verification (Reset) ── */}
            {isOtpReset && (
              <>
                <h2 className="auth-form-title">Enter Reset Code</h2>
                <p className="auth-form-sub">Enter the 6-digit code sent to <strong>{authData.email}</strong></p>
                <OtpInput length={6} onComplete={(v)=>{setOtpValue(v);onResetOtp(v)}} onChange={setOtpValue} />
                {error && <div className="auth-error">{error}</div>}
                <button type="button" className="auth-submit" onClick={()=>onResetOtp(otpValue)} disabled={otpValue.length!==6} style={{opacity:otpValue.length!==6?0.5:1}}>Verify Code 📬</button>
                <div style={{textAlign:"center",marginTop:12}}>
                  <span style={{fontSize:12,color:"var(--muted)"}}>Didn't receive it? </span>
                  {resendTimer > 0 ? <span style={{fontSize:12,color:"var(--muted)"}}>Resend in {resendTimer}s</span> :
                    <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={handleResend}>Resend code</button>}
                </div>
                <div style={{textAlign:"center",marginTop:8}}>
                  <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={()=>setFlow("forgot")}>← Back to forgot password</button>
                </div>
              </>
            )}

            {/* ── Reset Password ── */}
            {isResetPassword && (
              <>
                <h2 className="auth-form-title">Set New Password</h2>
                <p className="auth-form-sub">Choose a strong password for your account.</p>
                <div className="form-group"><label className="form-label">New Password</label>
                  <div style={{position:"relative"}}>
                    <input className="form-input" type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a strong password" autoComplete="new-password" style={{paddingRight:40}} />
                    <button type="button" onClick={()=>setShowPassword(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,opacity:0.5}}>{showPassword?"👁️":"👁️‍🗨️"}</button>
                  </div>
                  <PasswordStrength password={password} />
                </div>
                {error && <div className="auth-error">{error}</div>}
                <button type="button" className="auth-submit" onClick={()=>onResetPassword(password)} disabled={password.length<8} style={{opacity:password.length<8?0.5:1}}>Reset Password 🔄</button>
                <div style={{textAlign:"center",marginTop:8}}>
                  <button type="button" className="auth-switch-link" style={{fontSize:12}} onClick={()=>setFlow("login")}>← Back to login</button>
                </div>
              </>
            )}

            {/* ── Social Login & Switch ── */}
            {(isLogin || isSignup) && (
              <>
                <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0"}}>
                  <div style={{flex:1,height:1,background:"var(--border)"}}/>
                  <span style={{fontSize:11,color:"var(--muted)",whiteSpace:"nowrap"}}>or continue with</span>
                  <div style={{flex:1,height:1,background:"var(--border)"}}/>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <button type="button" className="auth-social-btn" onClick={()=>alert("Google Sign-In requires a Google OAuth Client ID. Add one to enable it.")}>
                    <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    Google
                  </button>
                  <button type="button" className="auth-social-btn" onClick={()=>alert("GitHub Sign-In requires a GitHub OAuth Client ID. Add one to enable it.")}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--text)"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                    GitHub
                  </button>
                </div>
                <p className="auth-switch" style={{marginTop:16}}>
                  {isSignup?"Already have an account?":"New user?"}{" "}
                  <button type="button" className="auth-switch-link" onClick={()=>onModeChange(isSignup?"login":"signup")}>{isSignup?"Login":"Create account"}</button>
                </p>
              </>
            )}

          </form>
          <p className="auth-footer">Backend auth + Groq proxy enabled.</p>
        </div>
      </div>
    </>
  );
}

/* ── Global CSS ── */
const GLOBAL_CSS = `
/* ── Reset & Variables ── */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#f0fdf4;--bg2:#dcfce7;--surface:#ffffff;--surface2:#f0fdf4;
  --accent:#16a34a;--accent2:#15803d;--accent3:#22c55e;--accent-glow:rgba(34,197,94,0.25);
  --text:#052e16;--text2:#166534;--muted:#334155;--muted2:#64748b;
  --border:#bbf7d0;--border2:#d9f99d;
  --user-bg:linear-gradient(135deg,#16a34a,#15803d);--ai-bg:rgba(255,255,255,0.85);
  --ai-border:#bbf7d0;--chip:#dcfce7;--chip-border:#bbf7d0;
  --input-bg:#ffffff;--input-border:#bbf7d0;
  --shadow:0 4px 24px rgba(0,0,0,0.08);--shadow-lg:0 12px 48px rgba(0,0,0,0.12);
  --radius:16px;--radius-sm:10px;--radius-xs:8px;
  --glass:rgba(255,255,255,0.7);--glass-border:rgba(255,255,255,0.3);
  --font:'Inter','Segoe UI',system-ui,-apple-system,sans-serif;
}
.dark{
  --bg:#022c22;--bg2:#064e3b;--surface:#0a1f17;--surface2:#0f2920;
  --accent:#22c55e;--accent2:#16a34a;--accent3:#4ade80;--accent-glow:rgba(34,197,94,0.35);
  --text:#ecfdf5;--text2:#a7f3d0;--muted:#94a3b8;--muted2:#64748b;
  --border:#064e3b;--border2:#065f46;
  --user-bg:linear-gradient(135deg,#16a34a,#15803d);--ai-bg:rgba(15,41,32,0.9);
  --ai-border:#064e3b;--chip:#0f2920;--chip-border:#064e3b;
  --input-bg:#0a1f17;--input-border:#064e3b;
  --shadow:0 4px 24px rgba(0,0,0,0.3);--shadow-lg:0 12px 48px rgba(0,0,0,0.4);
  --glass:rgba(10,31,23,0.8);--glass-border:rgba(6,78,59,0.5);
}
html,body,#root{height:100%;overflow:hidden}
body{font-family:var(--font);background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}

/* ── Animations ── */
@keyframes fadeInUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes scaleIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
@keyframes slideInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes slideUp{from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
@keyframes dotBounce{0%,80%,100%{transform:scale(0.4);opacity:0.3}40%{transform:scale(1);opacity:1}}
@keyframes pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(220,38,38,0.4)}50%{transform:scale(1.15);box-shadow:0 0 20px 6px rgba(220,38,38,0.2)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(0deg)}33%{transform:translateY(-20px) rotate(5deg)}66%{transform:translateY(-10px) rotate(-3deg)}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes glow{0%,100%{box-shadow:0 0 5px var(--accent-glow)}50%{box-shadow:0 0 20px var(--accent-glow),0 0 40px rgba(34,197,94,0.1)}}
@keyframes borderGlow{0%,100%{border-color:var(--accent)}50%{border-color:var(--accent3)}}
@keyframes msgAppear{from{opacity:0;transform:translateY(12px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}

.msg-enter{animation:msgAppear 0.35s cubic-bezier(0.16,1,0.3,1) both}
.modal-enter{animation:scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) both}
.sheet-enter{animation:slideUp 0.35s cubic-bezier(0.16,1,0.3,1) both}
.popup-enter{animation:scaleIn 0.25s cubic-bezier(0.16,1,0.3,1) both}
.auth-enter{animation:fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) both}
.dot-bounce{animation:dotBounce 1.2s infinite ease-in-out}

/* ── App Layout ── */
.app-root{display:flex;height:100dvh;background:var(--bg);overflow:hidden;position:relative}

/* ── Particles ── */
.particles-container{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
.particle{position:absolute;border-radius:50%;animation:float linear infinite}
.particle-0{width:8px;height:8px;background:var(--accent);bottom:-20px}
.particle-1{width:12px;height:12px;background:var(--accent2);bottom:-20px;border-radius:30%}
.particle-2{width:6px;height:6px;background:var(--accent3);bottom:-20px}
.particle-3{width:10px;height:10px;background:var(--muted);bottom:-20px;border-radius:40%}

/* ── Sidebar ── */
.sidebar{display:flex;flex-direction:column;background:var(--surface);border-right:1px solid var(--border);flex-shrink:0;overflow-y:auto;overflow-x:hidden;transition:width 0.3s cubic-bezier(0.16,1,0.3,1),transform 0.3s cubic-bezier(0.16,1,0.3,1);position:relative;z-index:10}
.sidebar.desktop.expanded{width:270px}
.sidebar.desktop.collapsed{width:68px}
.sidebar.mobile{position:fixed;top:0;left:0;height:100dvh;width:270px;z-index:90;box-shadow:var(--shadow-lg)}
.sidebar.mobile.closed{transform:translateX(-100%)}
.sidebar.mobile.open{transform:translateX(0)}
.sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:89;animation:fadeIn 0.2s ease}

.sidebar-toggle-btn{width:28px;height:28px;border-radius:8px;background:var(--chip);border:1px solid var(--chip-border);color:var(--muted);cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;transition:all 0.2s;flex-shrink:0}
.sidebar-toggle-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent);transform:scale(1.1)}
.sidebar-header{padding:16px 14px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px}
.sidebar.collapsed .sidebar-header{justify-content:center;padding:14px 8px}
.sidebar-brand{display:flex;align-items:center;gap:10px;min-width:0}
.sidebar-brand-text{min-width:0}
.sidebar-logo{width:38px;height:38px;border-radius:12px;background:var(--user-bg);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 12px rgba(0,0,0,0.15);flex-shrink:0}
.sidebar-name{font-weight:800;font-size:16px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-tagline{font-size:10px;color:var(--muted);letter-spacing:0.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-section{padding:10px 14px 6px;transition:padding 0.3s}
.sidebar.collapsed .sidebar-section{padding:10px 8px 6px}
.sidebar.collapsed .collapsed-section{padding:8px 6px 6px}
.sidebar-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:6px;white-space:nowrap}
.sidebar-select{width:100%;padding:9px 12px;border-radius:var(--radius-xs);border:1.5px solid var(--border);background:var(--input-bg);color:var(--text);font-size:13px;cursor:pointer;outline:none;transition:all 0.2s}
.sidebar.collapsed .collapsed-select{width:100%;padding:9px 8px;font-size:11px;border-radius:var(--radius-xs);appearance:none;text-align:center;cursor:pointer}
.sidebar-select:focus{border-color:var(--accent)}
.new-chat-btn{width:100%;padding:10px;border-radius:var(--radius-sm);background:transparent;border:1.5px solid var(--accent);color:var(--accent);font-weight:700;font-size:13px;cursor:pointer;transition:all 0.2s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar.collapsed .collapsed-new-chat{padding:10px 8px;font-size:14px}
.new-chat-btn:hover{background:var(--accent);color:#fff;transform:translateY(-1px);box-shadow:0 4px 12px var(--accent-glow)}
.sidebar-modes{flex:1;overflow-y:auto}
.sidebar-mode-btn{width:100%;padding:9px 10px;border-radius:var(--radius-xs);border:none;cursor:pointer;text-align:left;display:flex;align-items:center;gap:9px;background:transparent;color:var(--text);transition:all 0.2s;margin-bottom:2px;white-space:nowrap;overflow:hidden}
.sidebar.collapsed .collapsed-mode-btn{padding:9px;justify-content:center;gap:0}
.sidebar-mode-btn:hover{background:var(--chip);transform:translateX(3px)}
.sidebar.collapsed .collapsed-mode-btn:hover{transform:scale(1.1)}
.sidebar-mode-btn.active{background:var(--accent);color:#fff;box-shadow:0 4px 12px var(--accent-glow)}
.sidebar-mode-btn.active .sidebar-mode-desc{color:rgba(255,255,255,0.7)}
.sidebar-mode-icon{font-size:17px;flex-shrink:0;width:24px;text-align:center}
.sidebar-mode-text{min-width:0}
.sidebar-mode-name{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-mode-desc{font-size:10px;opacity:0.65;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-chats{border-top:1px solid var(--border);padding-top:8px}
.sidebar-chat-row{display:flex;align-items:center;gap:2px;border-radius:var(--radius-xs);transition:background 0.15s}
.sidebar-chat-row:hover{background:var(--chip)}
.sidebar-chat-row:hover .sidebar-chat-actions{opacity:1;pointer-events:auto}
.sidebar-chat-btn{flex:1;padding:7px 10px;border:none;cursor:pointer;text-align:left;background:transparent;color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:color 0.15s;min-width:0;border-radius:var(--radius-xs)}
.sidebar-chat-btn:hover{color:var(--text)}
.sidebar-chat-actions{display:flex;gap:2px;opacity:0;pointer-events:none;transition:opacity 0.15s;flex-shrink:0;padding-right:4px}
.chat-action-btn{width:24px;height:24px;border:none;border-radius:6px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;background:transparent;transition:all 0.15s;padding:0}
.archive-btn:hover{background:var(--accent);color:#fff}
.delete-btn:hover{background:#dc2626;color:#fff}
.restore-btn:hover{background:var(--accent);color:#fff}
.sidebar-archive-toggle{width:100%;padding:6px 10px;border:none;background:transparent;color:var(--muted);font-size:11px;cursor:pointer;text-align:left;margin-top:4px;transition:color 0.15s}
.sidebar-archive-toggle:hover{color:var(--text)}
.sidebar-footer{padding:12px 14px 18px;border-top:1px solid var(--border);transition:padding 0.3s}
.sidebar.collapsed .collapsed-footer{padding:12px 8px 18px}
.sidebar-user-card{padding:10px 12px;border-radius:var(--radius-xs);background:var(--chip);border:1px solid var(--chip-border);margin-bottom:8px}
.sidebar-user-name{font-weight:700;font-size:12.5px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sidebar-user-email{color:var(--muted);font-size:10px;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sidebar-user-avatar{width:36px;height:36px;border-radius:50%;background:var(--chip);border:1px solid var(--chip-border);display:flex;align-items:center;justify-content:center;font-size:16px;margin:0 auto 8px;cursor:default}
.sidebar-footer-btn{width:100%;padding:8px;border-radius:var(--radius-xs);background:transparent;border:1px solid var(--chip-border);color:var(--muted);cursor:pointer;font-size:12px;margin-bottom:5px;transition:all 0.2s;text-align:left;padding-left:10px;white-space:nowrap;overflow:hidden}
.sidebar.collapsed .collapsed-footer-btn{padding:9px;text-align:center;font-size:14px;padding-left:0}
.sidebar-footer-btn:hover{background:var(--chip);color:var(--text);border-color:var(--accent)}

/* ── Chat Main ── */
.chat-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0;position:relative}

/* ── Header ── */
.chat-header{background:var(--user-bg);flex-shrink:0;box-shadow:var(--shadow);position:relative;z-index:5;backdrop-filter:blur(10px)}
.desktop-header{padding:12px 16px;display:flex;align-items:center;gap:10px}
.mobile-header{padding:0}
.header-row{display:flex;align-items:center;gap:8;padding:9px 12px}
.header-row+.header-row{padding-top:0;padding-bottom:8px}
.icon-btn{background:transparent;border:none;color:#fff;cursor:pointer;font-size:22px;padding:0;line:1;transition:transform 0.15s}
.icon-btn:hover{transform:scale(1.1)}
.header-title-wrap{flex:1;min-width:0}
.header-title{color:#fff;font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header-subtitle{color:rgba(255,255,255,0.6);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.header-weather-btn{background:rgba(255,255,255,0.14);border:1px solid rgba(255,255,255,0.22);color:#fff;cursor:pointer;padding:5px 10px;border-radius:20px;display:flex;align-items:center;gap:6px;font-size:12px;transition:all 0.2s;flex-shrink:0}
.header-weather-btn:hover{background:rgba(255,255,255,0.22);transform:translateY(-1px)}
.header-weather-temp{font-weight:700;font-size:12px}
.header-weather-city{font-size:10px;opacity:0.75}
.header-weather-details{font-size:10px;opacity:0.7;line-height:1.3;text-align:left}
.header-weather-icon{font-size:17px}
.header-weather-wrap{position:relative;flex-shrink:0}
.header-avatar{background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);color:#fff;cursor:pointer;width:36px;height:36px;border-radius:50%;font-size:17px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
.header-avatar:hover{background:rgba(255,255,255,0.25);transform:scale(1.08)}
.header-action-btn{background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.22);color:#fff;cursor:pointer;padding:6px 12px;border-radius:10px;font-size:12px;display:flex;align-items:center;gap:5px;flex-shrink:0;transition:all 0.2s}
.header-action-btn:hover{background:rgba(255,255,255,0.22)}
.header-mode-pill{flex:1;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.18);color:#fff;cursor:pointer;padding:5px 10px;border-radius:20px;font-size:11px;display:flex;align-items:center;gap:5px;overflow:hidden;transition:all 0.2s}
.header-mode-pill:hover{background:rgba(255,255,255,0.18)}
.header-mode-text{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:500}
.header-mode-arrow{margin-left:auto;opacity:0.6;font-size:9px}
.header-clear-mode{background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;width:28px;height:28px;border-radius:50%;font-size:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s}
.header-clear-mode:hover{background:rgba(220,38,38,0.6);transform:rotate(90deg)}
.header-loading{color:rgba(255,255,255,0.9);font-size:11px;display:flex;align-items:center;gap:5px;flex-shrink:0}

/* ── Weather Popup ── */
.weather-popup{position:absolute;top:calc(100% + 10px);right:0;z-index:200;background:var(--surface);border:1.5px solid var(--accent);border-radius:var(--radius);box-shadow:var(--shadow-lg);width:290px;overflow:hidden}
.weather-popup.mobile{position:relative;width:100%;max-width:340;border-radius:var(--radius);margin:0 12px}
.weather-popup-header{background:var(--accent2);padding:12px 14px;color:#fff;display:flex;align-items:center;justify-content:space-between}
.weather-popup-city{font-weight:700;font-size:13px;color:#fff}
.weather-popup-province{font-size:10px;opacity:0.65;color:rgba(255,255,255,0.8)}
.weather-refresh-btn{background:rgba(255,255,255,0.15);border:none;color:#fff;border-radius:7px;padding:5px 10px;font-size:11px;cursor:pointer;transition:background 0.15s}
.weather-refresh-btn:hover{background:rgba(255,255,255,0.3)}
.weather-popup-main{display:flex;align-items:center;gap:12px;padding:14px}
.weather-popup-big-icon{font-size:36px}
.weather-popup-temp{font-size:28px;font-weight:800;line-height:1;color:#fff}
.weather-popup-desc{font-size:12px;color:rgba(255,255,255,0.75)}
.weather-popup-stats{margin-left:auto;text-align:right;font-size:11px;color:rgba(255,255,255,0.8);line-height:1.5}
.weather-popup-cities{padding:10px 12px;max-height:200px;overflow-y:auto}
.weather-city-scroll{max-height:180px;overflow-y:auto;display:flex;flex-direction:column;gap:2px}

/* ── Messages ── */
.messages-container{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:14px;position:relative;z-index:1;scroll-behavior:smooth}
.message-row{display:flex;justify-content:flex-start;align-items:flex-start;gap:10px}
.message-row.user{justify-content:flex-end}
.avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;margin-top:2px;transition:transform 0.2s}
.avatar:hover{transform:scale(1.1)}
.assistant-avatar{background:var(--accent);box-shadow:0 4px 12px var(--accent-glow)}
.user-avatar{background:var(--accent2);box-shadow:0 4px 12px rgba(0,0,0,0.1)}
.message-bubble{max-width:78%;border-radius:18px;padding:12px 16px;font-size:14px;line-height:1.7;word-break:break-word;transition:transform 0.2s,box-shadow 0.2s}
.message-bubble:hover{transform:translateY(-1px)}
.user-bubble{background:var(--user-bg);color:#fff;border-radius:18px 18px 4px 18px;box-shadow:0 4px 16px rgba(0,0,0,0.12)}
.ai-bubble{background:var(--ai-bg);color:var(--text);border:1px solid var(--ai-border);border-radius:4px 18px 18px 18px;backdrop-filter:blur(10px);box-shadow:var(--shadow)}
.ai-bubble.streaming{border-color:var(--accent);animation:borderGlow 2s ease infinite}
.typing-cursor{display:inline-block;width:7px;height:16px;background:var(--accent);border-radius:2px;margin-left:3px;vertical-align:text-bottom;animation:blink 0.9s infinite}

/* ── Markdown ── */
.md-h1,.md-h2,.md-h3{font-weight:700;margin:8px 0 4px;color:var(--text)}
.md-h1{font-size:1.1em}.md-h2{font-size:1.04em}.md-h3{font-size:0.97em}
.md-list{margin:6px 0;padding-left:22px}
.md-list li{margin:3px 0}
.md-ol{list-style-type:decimal}
.inline-code{background:rgba(0,0,0,0.08);padding:1px 6px;border-radius:4px;font-size:0.87em;font-family:'JetBrains Mono',monospace}
.dark .inline-code{background:rgba(255,255,255,0.1)}

/* ── Quick Chips ── */
.quick-chips{padding:4px 12px 8px;display:flex;flex-wrap:wrap;gap:6px;overflow-x:auto;position:relative;z-index:1}
.chip{padding:7px 14px;border-radius:20px;background:var(--chip);border:1px solid var(--chip-border);color:var(--text);font-size:12px;cursor:pointer;font-weight:500;white-space:nowrap;transition:all 0.2s}
.chip:hover{background:var(--accent);color:#fff;border-color:var(--accent);transform:translateY(-2px);box-shadow:0 4px 12px var(--accent-glow)}

/* ── Input Area ── */
.input-area{padding:10px 14px 14px;background:var(--surface);border-top:1px solid var(--border);position:relative;z-index:2}
.image-preview{display:flex;align-items:center;gap:10px;margin-bottom:8px;padding:8px 12px;background:var(--chip);border:1.5px solid var(--accent);border-radius:var(--radius-sm);animation:fadeInUp 0.25s ease}
.image-preview-thumb{width:52px;height:52px;object-fit:cover;border-radius:var(--radius-xs);flex-shrink:0}
.image-preview-info{flex:1;min-width:0}
.image-preview-title{font-size:12px;font-weight:600;color:var(--accent)}
.image-preview-name{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.image-preview-remove{background:transparent;border:none;color:var(--muted);font-size:18px;cursor:pointer;transition:color 0.15s}
.image-preview-remove:hover{color:#dc2626}
.input-container{display:flex;gap:8px;align-items:flex-end;background:var(--surface2);border-radius:var(--radius);border:1.5px solid var(--input-border);padding:8px 8px 8px 10px;transition:border-color 0.2s,box-shadow 0.2s}
.input-container:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-glow)}
.input-icon-btn{width:36px;height:36px;border-radius:var(--radius-xs);border:1px solid var(--chip-border);cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-end;transition:all 0.2s}
.input-icon-btn:hover{transform:scale(1.08)}
.voice-btn.listening{background:#dc2626;border-color:#dc2626;color:#fff;animation:pulse 1.2s infinite ease-in-out}
.input-textarea{flex:1;background:transparent;border:none;outline:none;resize:none;font-size:14px;color:var(--text);line-height:1.6;max-height:120px;padding:0;font-family:var(--font)}
.input-textarea::placeholder{color:var(--muted);opacity:0.6}
.send-btn{width:40px;height:40px;border-radius:var(--radius-sm);border:none;color:#fff;cursor:pointer;font-size:18px;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.2s;background:var(--accent)}
.send-btn:hover:not(:disabled){transform:scale(1.08);box-shadow:0 4px 16px var(--accent-glow)}
.send-btn:disabled{background:var(--muted);opacity:0.5;cursor:not-allowed}
.send-spinner{animation:spin 1s linear infinite}
@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
.input-footer{text-align:center;margin-top:5px;font-size:10px;color:var(--muted);opacity:0.7}

/* ── City List ── */
.city-list{max-height:55dvh;overflow-y:auto;padding-right:4px}
.city-province{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.8px;margin:8px 0 4px;padding-left:4px}
.city-btn{width:100%;padding:8px 12px;border-radius:var(--radius-xs);border:1.5px solid var(--chip-border);background:var(--chip);color:var(--text);cursor:pointer;font-size:13px;text-align:left;display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;transition:all 0.2s}
.city-btn:hover{border-color:var(--accent);transform:translateX(3px)}
.city-btn.active{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 4px 12px var(--accent-glow)}
.city-btn.mini{padding:6px 10px;font-size:12px;border:none;border-radius:7px}
.city-coords{font-size:10px;opacity:0.6}

/* ── Modals ── */
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:999}
.modal-card{background:var(--surface);border-radius:var(--radius);padding:28px;width:100%;max-width:420px;border:2px solid var(--accent);box-shadow:var(--shadow-lg);max-height:90dvh;overflow-y:auto}
.modal-icon{text-align:center;margin-bottom:6px;font-size:40px}
.modal-title{text-align:center;margin:0 0 6px;color:var(--text);font-size:20px;font-weight:800}
.modal-sub{text-align:center;color:var(--muted);font-size:13px;margin:0 0 16px}
.modal-info-box{background:var(--chip);border-radius:var(--radius-xs);padding:12px 14px;margin-bottom:16px;font-size:13px;color:var(--muted);line-height:1.7;border:1px solid var(--chip-border)}
.modal-input{width:100%;padding:12px 16px;border-radius:var(--radius-sm);border:1.5px solid var(--input-border);background:var(--input-bg);color:var(--text);font-size:14px;outline:none;margin-bottom:12px;transition:border-color 0.2s}
.modal-input:focus{border-color:var(--accent)}
.modal-btn-primary{width:100%;padding:13px;border-radius:var(--radius-sm);background:var(--accent);color:#fff;border:none;font-size:15px;font-weight:700;cursor:pointer;transition:all 0.2s}
.modal-btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 20px var(--accent-glow)}
.modal-btn-primary:disabled{opacity:0.5;cursor:not-allowed}
.modal-btn-secondary{width:100%;padding:11px;border-radius:var(--radius-sm);background:transparent;color:var(--muted);border:1.5px solid var(--input-border);cursor:pointer;font-size:14px;transition:all 0.2s}
.modal-btn-secondary:hover{background:var(--chip);border-color:var(--accent)}
.modal-footer-text{text-align:center;font-size:11px;color:var(--muted);margin-top:10px}
.modal-section-title{margin:0 0 4px;color:var(--text);font-size:16px;font-weight:700}
.modal-section-sub{font-size:12px;color:var(--muted);margin:0 0 14px}

/* ── Forms ── */
.form-group{margin-bottom:12px}
.form-label{display:block;font-size:12px;font-weight:700;color:var(--muted);margin-bottom:5px}
.form-input{width:100%;padding:10px 13px;border-radius:var(--radius-xs);border:1.5px solid var(--input-border);background:var(--input-bg);color:var(--text);font-size:14px;outline:none;transition:border-color 0.2s}
.form-input:focus{border-color:var(--accent)}
.link-btn{margin-top:6px;padding:6px 12px;border-radius:var(--radius-xs);background:var(--chip);border:1px solid var(--chip-border);color:var(--muted);cursor:pointer;font-size:12px;transition:all 0.2s}
.link-btn:hover{background:var(--accent);color:#fff;border-color:var(--accent)}

/* ── Bottom Sheet ── */
.bottom-sheet-backdrop{position:fixed;inset:0;z-index:998;display:flex;flex-direction:column;justify-content:flex-end}
.bottom-sheet-overlay{position:absolute;inset:0;background:rgba(0,0,0,0.5)}
.bottom-sheet{position:relative;background:var(--surface);border-radius:20px 20px 0 0;padding:16px 16px 32px;max-height:75dvh;overflow-y:auto}
.bottom-sheet-handle{width:40px;height:4px;background:var(--chip-border);border-radius:2px;margin:0 auto 14px}
.bottom-sheet-title{font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.9px;margin-bottom:10px}
.mode-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mode-card{padding:12px 10px;border-radius:var(--radius-sm);border:1.5px solid var(--chip-border);cursor:pointer;text-align:left;display:flex;align-items:center;gap:8px;background:var(--chip);color:var(--text);transition:all 0.2s}
.mode-card:hover{border-color:var(--accent);transform:translateY(-2px)}
.mode-card.active{background:var(--accent);color:#fff;border-color:var(--accent);box-shadow:0 4px 12px var(--accent-glow)}
.mode-icon{font-size:20px}
.mode-label{font-size:12px;font-weight:600}
.mode-desc{font-size:10px;opacity:0.6;margin-top:1px}

/* ── Export ── */
.export-btn{padding:14px 16px;border-radius:12px;border:none;cursor:pointer;font-size:14px;font-weight:700;display:flex;align-items:center;gap:10px;transition:all 0.2s}
.export-btn:hover{transform:translateY(-2px)}
.export-docx{background:var(--accent);color:#fff}
.export-docx:hover{box-shadow:0 6px 20px var(--accent-glow)}
.export-pdf{background:#dc2626;color:#fff}
.export-pdf:hover{box-shadow:0 6px 20px rgba(220,38,38,0.3)}
.export-icon{font-size:24px}
.export-desc{font-size:11px;opacity:0.75;font-weight:400}

/* ── Auth ── */
.auth-root{min-height:100dvh;background:linear-gradient(135deg,#022c22,#064e3b 55%,#0a1f17);display:flex;align-items:center;justify-content:center;padding:18px;position:relative;overflow:hidden}
.auth-bg-grid{position:absolute;inset:0;opacity:0.08;background-image:linear-gradient(45deg,transparent 48%,#4ade80 49%,#4ade80 51%,transparent 52%);background-size:38px 38px}
.auth-card{width:100%;max-width:430px;position:relative;z-index:1;background:var(--surface);border-radius:24px;padding:28px;box-shadow:var(--shadow-lg);border:1px solid var(--border)}
.auth-logo-wrap{text-align:center;margin-bottom:20px}
.auth-logo{width:76px;height:76px;margin:0 auto 12px;border-radius:22px;background:var(--user-bg);display:flex;align-items:center;justify-content:center;font-size:42px;box-shadow:0 16px 45px rgba(0,0,0,0.25);animation:glow 3s ease infinite}
.auth-title{margin:0;color:var(--text);font-size:30px;font-weight:900;letter-spacing:-0.5px}
.auth-sub{margin:6px 0 0;color:var(--muted);font-size:14px}
.auth-form{margin-top:0}
.auth-tabs{display:flex;background:var(--chip);border-radius:14px;padding:4px;margin-bottom:18px}
.auth-tab{flex:1;padding:10px;border:none;border-radius:11px;cursor:pointer;font-weight:800;background:transparent;color:var(--muted);transition:all 0.2s}
.auth-tab.active{background:var(--accent);color:#fff;box-shadow:0 4px 12px var(--accent-glow)}
.auth-form-title{margin:0 0 5px;color:var(--text);font-size:22px}
.auth-form-sub{margin:0 0 18px;color:var(--muted);font-size:13px}
.auth-error{background:#fef3c7;border:1px solid #fde047;color:#92400e;padding:10px 12px;border-radius:var(--radius-xs);font-size:12px;margin-bottom:12px;animation:fadeInUp 0.3s ease}
.auth-submit{width:100%;padding:14px;border-radius:14px;background:var(--accent);border:none;color:#fff;font-size:15px;font-weight:900;cursor:pointer;transition:all 0.2s;box-shadow:0 8px 24px var(--accent-glow)}
.auth-submit:hover{transform:translateY(-2px);box-shadow:0 12px 32px var(--accent-glow)}
.auth-social-btn{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;padding:11px;border-radius:12px;border:1.5px solid var(--chip-border);background:var(--surface);color:var(--text);font-size:13px;font-weight:700;cursor:pointer;transition:all 0.2s}
.auth-social-btn:hover{border-color:var(--accent);background:var(--chip);transform:translateY(-1px)}
.auth-switch{text-align:center;margin:14px 0 0;color:var(--muted);font-size:12px}
.auth-switch-link{border:none;background:transparent;color:var(--accent);font-weight:900;cursor:pointer;padding:0}
.auth-switch-link:hover{text-decoration:underline}
.auth-footer{text-align:center;color:rgba(255,255,255,0.5);font-size:11px;margin-top:14px}

/* ── Scrollbar ── */
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:10px}
::-webkit-scrollbar-thumb:hover{background:var(--muted)}
::-webkit-scrollbar-track{background:transparent}

/* ── Selection ── */
::selection{background:var(--accent);color:#fff}

/* ── Responsive ── */
@media(max-width:767px){
  .messages-container{padding:12px 10px}
  .message-bubble{max-width:85%}
  .header-weather-wrap{display:none}
  .weather-popup.mobile{position:fixed;top:90px;left:12px;right:12px;max-width:100%}
}
`;
