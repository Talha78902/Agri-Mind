import { useState, useRef, useEffect, useCallback } from "react";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

// Pakistan cities with coordinates and province
const PAKISTAN_CITIES = [
  { name:"Multan",       province:"Punjab",           lat:30.1575, lng:71.5249 },
  { name:"Lahore",       province:"Punjab",           lat:31.5204, lng:74.3587 },
  { name:"Faisalabad",   province:"Punjab",           lat:31.4504, lng:73.1350 },
  { name:"Rawalpindi",   province:"Punjab",           lat:33.5651, lng:73.0169 },
  { name:"Gujranwala",   province:"Punjab",           lat:32.1877, lng:74.1945 },
  { name:"Sargodha",     province:"Punjab",           lat:32.0836, lng:72.6711 },
  { name:"Bahawalpur",   province:"Punjab",           lat:29.3956, lng:71.6836 },
  { name:"Sialkot",      province:"Punjab",           lat:32.4945, lng:74.5229 },
  { name:"Sheikhupura",  province:"Punjab",           lat:31.7167, lng:73.9850 },
  { name:"Rahim Yar Khan",province:"Punjab",          lat:28.4202, lng:70.2952 },
  { name:"Jhang",        province:"Punjab",           lat:31.2681, lng:72.3181 },
  { name:"Dera Ghazi Khan",province:"Punjab",         lat:30.0463, lng:70.6401 },
  { name:"Gujrat",       province:"Punjab",           lat:32.5736, lng:74.0790 },
  { name:"Sahiwal",      province:"Punjab",           lat:30.6682, lng:73.1066 },
  { name:"Wah Cantt",    province:"Punjab",           lat:33.7715, lng:72.7084 },
  { name:"Okara",        province:"Punjab",           lat:30.8138, lng:73.4534 },
  { name:"Kasur",        province:"Punjab",           lat:31.1204, lng:74.4470 },
  { name:"Khanewal",     province:"Punjab",           lat:30.3015, lng:71.9328 },
  { name:"Hafizabad",    province:"Punjab",           lat:32.0714, lng:73.6881 },
  { name:"Pakpattan",    province:"Punjab",           lat:30.3437, lng:73.3874 },
  { name:"Karachi",      province:"Sindh",            lat:24.8607, lng:67.0011 },
  { name:"Hyderabad",    province:"Sindh",            lat:25.3960, lng:68.3578 },
  { name:"Sukkur",       province:"Sindh",            lat:27.7052, lng:68.8574 },
  { name:"Larkana",      province:"Sindh",            lat:27.5570, lng:68.2264 },
  { name:"Nawabshah",    province:"Sindh",            lat:26.2442, lng:68.4100 },
  { name:"Mirpur Khas",  province:"Sindh",            lat:25.5270, lng:69.0110 },
  { name:"Jacobabad",    province:"Sindh",            lat:28.2769, lng:68.4386 },
  { name:"Shikarpur",    province:"Sindh",            lat:27.9558, lng:68.6380 },
  { name:"Peshawar",     province:"KPK",              lat:34.0151, lng:71.5249 },
  { name:"Mardan",       province:"KPK",              lat:34.2010, lng:72.0449 },
  { name:"Abbottabad",   province:"KPK",              lat:34.1688, lng:73.2215 },
  { name:"Mingora",      province:"KPK",              lat:34.7717, lng:72.3600 },
  { name:"Kohat",        province:"KPK",              lat:33.5869, lng:71.4429 },
  { name:"Bannu",        province:"KPK",              lat:32.9891, lng:70.6000 },
  { name:"Dera Ismail Khan",province:"KPK",           lat:31.8314, lng:70.9019 },
  { name:"Nowshera",     province:"KPK",              lat:34.0153, lng:71.9747 },
  { name:"Quetta",       province:"Balochistan",      lat:30.1798, lng:66.9750 },
  { name:"Turbat",       province:"Balochistan",      lat:26.0023, lng:63.0440 },
  { name:"Khuzdar",      province:"Balochistan",      lat:27.8000, lng:66.6167 },
  { name:"Gwadar",       province:"Balochistan",      lat:25.1216, lng:62.3254 },
  { name:"Hub",          province:"Balochistan",      lat:25.0500, lng:66.8900 },
  { name:"Islamabad",    province:"Federal Capital",  lat:33.6844, lng:73.0479 },
  { name:"Mirpur",       province:"AJK",              lat:33.1476, lng:73.7506 },
  { name:"Muzaffarabad", province:"AJK",              lat:34.3700, lng:73.4710 },
  { name:"Gilgit",       province:"Gilgit-Baltistan", lat:35.9221, lng:74.3087 },
  { name:"Skardu",       province:"Gilgit-Baltistan", lat:35.2971, lng:75.6333 },
];

const PAKISTAN_DISTRICTS = [
  "Attock","Bahawalnagar","Bahawalpur","Bhakkar","Chakwal","Chiniot",
  "Dera Ghazi Khan","Faisalabad","Gujranwala","Gujrat","Hafizabad",
  "Jhang","Jhelum","Kasur","Khanewal","Khushab","Lahore","Layyah",
  "Lodhran","Mandi Bahauddin","Mianwali","Multan","Muzaffargarh",
  "Nankana Sahib","Narowal","Okara","Pakpattan","Rahim Yar Khan",
  "Rajanpur","Rawalpindi","Sahiwal","Sargodha","Sheikhupura","Sialkot",
  "Toba Tek Singh","Vehari",
  "Badin","Dadu","Ghotki","Hyderabad","Jacobabad","Jamshoro",
  "Karachi","Kashmore","Khairpur","Larkana","Matiari","Mirpur Khas",
  "Naushahro Feroze","Nawabshah","Qambar Shahdadkot","Sanghar",
  "Shikarpur","Sukkur","Tando Allahyar","Tando Muhammad Khan","Thatta","Umerkot",
  "Abbottabad","Bajaur","Bannu","Battagram","Bunir","Charsadda","Chitral",
  "Dera Ismail Khan","Dir Lower","Dir Upper","Hangu","Haripur","Karak",
  "Kohat","Kohistan","Kurram","Lakki Marwat","Malakand","Mansehra",
  "Mardan","Mohmand","North Waziristan","Nowshera","Orakzai","Peshawar",
  "Shangla","South Waziristan","Swabi","Swat","Tank","Torghar",
  "Awaran","Barkhan","Chagai","Dera Bugti","Gwadar","Harnai","Hub",
  "Jaffarabad","Jhal Magsi","Kalat","Kech","Kharan","Khuzdar",
  "Killa Abdullah","Killa Saifullah","Kohlu","Lasbela","Loralai",
  "Mastung","Musakhel","Nasirabad","Nushki","Panjgur","Pishin","Quetta",
  "Sherani","Sibi","Sohbatpur","Turbat","Washuk","Zhob","Ziarat",
  "Islamabad",
  "Mirpur","Muzaffarabad","Neelum","Haveli","Bagh","Kotli","Poonch","Sudhnoti",
  "Astore","Ghanche","Ghizer","Gilgit","Hunza","Kharmang","Nagar","Shigar","Skardu",
].sort();

const GROQ_MODELS = [
  { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", desc: "Best quality" },
  { id: "llama-3.1-8b-instant",    label: "Llama 3.1 8B",  desc: "Fastest" },
  { id: "mixtral-8x7b-32768",      label: "Mixtral 8x7B",  desc: "Balanced" },
];

const EXPERT_MODES = [
  { id: "agronomist",  label: "Agronomist",        icon: "🌾", desc: "Crop management & yield",        prompt: "You are an expert agronomist. Provide professional guidance on crop management, soil fertility, seeding rates, nutrient scheduling, crop physiology, and yield optimization." },
  { id: "crop_doctor", label: "Crop Doctor",        icon: "🔬", desc: "Disease diagnosis & treatment",  prompt: "You are a plant pathologist and crop doctor. Diagnose crop diseases, nutrient deficiencies, leaf discoloration, fungal/bacterial/viral symptoms, and suggest precise treatments with specific product names." },
  { id: "pest_id",     label: "Pest Expert",        icon: "🐛", desc: "Pest ID & IPM strategies",       prompt: "You are an entomologist and pest management expert. Identify pests, explain life cycles, damage symptoms, prevention methods, IPM strategies, and pesticide recommendations." },
  { id: "soil",        label: "Soil Expert",        icon: "🪨", desc: "Soil health & fertility",        prompt: "You are a soil scientist. Analyze soil issues, pH imbalances, nutrient deficiencies, salinity, organic matter management, and provide detailed fertilizer recommendations." },
  { id: "irrigation",  label: "Irrigation Advisor", icon: "💧", desc: "Water management & scheduling",  prompt: "You are an irrigation and water management expert. Recommend irrigation schedules, water-saving methods, drip/sprinkler suitability, moisture management, and drought prevention strategies." },
  { id: "rotation",    label: "Crop Rotation",      icon: "🔄", desc: "Season-wise rotation planning",  prompt: "You are a crop rotation planning expert. Generate season-wise rotation plans based on soil type, climate, previous crops, and nutrient balance for maximum sustainability." },
  { id: "weather",     label: "Weather Advisory",   icon: "🌦️", desc: "Weather-based crop advice",      prompt: "You are a meteorological agricultural advisor. Provide crop advice based on weather conditions, rainfall, humidity, frost risk, heat stress, and seasonal forecasts." },
  { id: "research",    label: "Research Assistant", icon: "📚", desc: "Scientific agriculture answers", prompt: "You are an agricultural research scientist. Answer scientific agriculture questions with detailed explanations. When asked about research papers, studies, or scientific literature, always provide: (1) full paper titles, (2) author names, (3) journal names and publication years, (4) DOI links or Google Scholar / PubMed / ResearchGate URLs where available. When a user asks for references, citations, links, or sources from a previous answer, always provide them fully — this is a core part of your role. Never refuse or skip reference requests." },
  { id: "calculator",  label: "Fertilizer Calc",    icon: "🧮", desc: "Doses, ratios & schedules",      prompt: "You are a fertilizer and pesticide calculation expert. Calculate fertilizer doses, pesticide mixing ratios, acre/hectare conversions, and nutrient application schedules with step-by-step math." },
  { id: "livestock",   label: "Livestock",          icon: "🐄", desc: "Animal health & management",    prompt: "You are a veterinary and livestock expert. Provide guidance on animal health, feeding schedules, vaccination programs, and farm management for livestock and poultry." },
  { id: "market",      label: "Market Advisor",     icon: "📈", desc: "Prices & market trends",         prompt: "You are an agricultural market analyst. Provide crop market trends, price guidance, storage advice, and optimal harvest timing recommendations." },
];

const QUICK_CHIPS = [
  "Leaves turning yellow 🍂", "Best fertilizer for wheat?", "How to treat fungal infection?",
  "Drip vs sprinkler irrigation", "Crop rotation for cotton", "Soil pH guide",
  "Organic pest control", "When to harvest tomatoes?",
];

// System prompt when conversation is ongoing — NO blocking rule at all
const SYSTEM_ONGOING = `You are AgriMind, an elite AI agricultural advisor. You are highly knowledgeable, practical, and farmer-friendly. This is an ongoing conversation — answer every message helpfully, including follow-ups, clarifications, "tell me more", "explain that", greetings, thanks, or anything else the user says. If the user asks for references, citations, paper links, DOIs, or sources from a previous answer, always provide them in full — author, title, journal, year, and URL/DOI. This is a normal and expected part of research conversations.

For agriculture questions always:
- Give specific, actionable advice with product names where relevant
- Ask clarifying questions when needed (crop type, location, symptoms, soil type)
- Structure answers with clear sections using markdown
- Mention safety warnings for pesticides/chemicals
- Respond in the same language the user writes in (English, Urdu اردو, or Sindhi سنڌي)
- Use bullet points, numbered lists, and headers for readability
- Be thorough but concise`;

// System prompt for the very first message — applies the off-topic block
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

// Patterns that are obviously off-topic — blocked immediately in JS (no API call needed)
const OFFTOPIC_PATTERNS = [
  /build\s+(me\s+)?(a\s+)?portfolio/i,
  /make\s+(me\s+)?(a\s+)?portfolio/i,
  /create\s+(me\s+)?(a\s+)?portfolio/i,
  /write\s+(me\s+)?(a\s+)?resume/i,
  /make\s+(me\s+)?(a\s+)?resume/i,
  /build\s+(me\s+)?(a\s+)?website/i,
  /create\s+(me\s+)?(a\s+)?website/i,
  /write\s+(me\s+)?(a\s+)?(poem|song|story|essay|novel)/i,
  /help\s+(me\s+)?(with\s+)?(my\s+)?math\s+homework/i,
  /translate\s+(this\s+)?(legal|law|contract)/i,
  /write\s+(me\s+)?(a\s+)?cover\s+letter/i,
];

export default function AgriAssistant() {
  const [apiKey, setApiKey] = useState(() => GROQ_API_KEY || localStorage.getItem("groq_key") || "");
  const [keyInput, setKeyInput] = useState("");
  const [showKeyModal, setShowKeyModal] = useState(() => !GROQ_API_KEY && !localStorage.getItem("groq_key"));
  const [selectedModel, setSelectedModel] = useState(GROQ_MODELS[0].id);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "🌱 **Assalam-o-Alaikum! Welcome to AgriMind.**\n\nI'm your free AI agricultural advisor powered by **Groq + Llama 3**. I can help you with:\n\n- 🔬 Crop disease diagnosis\n- 🐛 Pest identification & control\n- 💧 Irrigation planning\n- 🪨 Soil health & fertilizers\n- 🌾 Complete crop management\n- 🧮 Fertilizer & spray calculations\n\nSelect an **Expert Mode** from the menu or just ask your question!\n\nکھیتی باڑی کے بارے میں کیا جاننا چاہتے ہیں؟ 🌿" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [activeMode, setActiveMode] = useState(null);
  // On mobile sidebar is closed by default, on desktop open
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [darkMode, setDarkMode] = useState(false);
  const [farmProfile, setFarmProfile] = useState({ location: "", district: "", cropType: "", soilType: "", size: "", latitude: "", longitude: "" });
  const [showProfile, setShowProfile] = useState(false);
  const [showWeatherCity, setShowWeatherCity] = useState(false);
  const [weatherCity, setWeatherCity] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agrimind_weather_city") || "null") || PAKISTAN_CITIES[0]; } catch { return PAKISTAN_CITIES[0]; }
  });
  const [showModeSheet, setShowModeSheet] = useState(false);
  const [savedChats, setSavedChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem("agrimind_chats") || "[]"); } catch { return []; }
  });
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showWeatherPopup, setShowWeatherPopup] = useState(false);
  const [pestImage, setPestImage] = useState(null);       // { dataUrl, base64, mimeType, name }
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamText]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  // Fetch real-time weather from Open-Meteo (free, no key needed)
  const fetchWeather = async (city) => {
    setWeatherLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&wind_speed_unit=kmh&timezone=auto`;
      const res = await fetch(url);
      const data = await res.json();
      const c = data.current;
      const wmoIcons = {
        0:"☀️", 1:"🌤️", 2:"⛅", 3:"☁️",
        45:"🌫️", 48:"🌫️",
        51:"🌦️", 53:"🌦️", 55:"🌦️",
        61:"🌧️", 63:"🌧️", 65:"🌧️",
        71:"❄️", 73:"❄️", 75:"❄️", 77:"❄️",
        80:"🌦️", 81:"🌧️", 82:"⛈️",
        85:"❄️", 86:"❄️",
        95:"⛈️", 96:"⛈️", 99:"⛈️",
      };
      const wmoDesc = {
        0:"Clear", 1:"Mainly Clear", 2:"Partly Cloudy", 3:"Overcast",
        45:"Foggy", 48:"Icy Fog",
        51:"Light Drizzle", 53:"Drizzle", 55:"Heavy Drizzle",
        61:"Light Rain", 63:"Rain", 65:"Heavy Rain",
        71:"Light Snow", 73:"Snow", 75:"Heavy Snow", 77:"Snow Grains",
        80:"Showers", 81:"Heavy Showers", 82:"Violent Showers",
        85:"Snow Showers", 86:"Heavy Snow Showers",
        95:"Thunderstorm", 96:"Thunderstorm", 99:"Thunderstorm",
      };
      const code = c.weather_code;
      setWeather({
        temp: Math.round(c.temperature_2m),
        humidity: c.relative_humidity_2m,
        wind: Math.round(c.wind_speed_10m),
        icon: wmoIcons[code] || "🌡️",
        desc: wmoDesc[code] || "Unknown",
      });
    } catch {
      setWeather(null);
    } finally {
      setWeatherLoading(false);
    }
  };

  useEffect(() => { fetchWeather(weatherCity); }, [weatherCity]);

  // Refresh weather every 10 minutes
  useEffect(() => {
    const interval = setInterval(() => fetchWeather(weatherCity), 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [weatherCity]);

  // Close sidebar on mobile when tapping outside
  const handleOverlayClick = () => { if (isMobile) setSidebarOpen(false); };

  const saveKey = () => {
    const k = keyInput.trim();
    if (!k) return;
    localStorage.setItem("groq_key", k);
    setApiKey(k);
    setShowKeyModal(false);
  };

  const buildSystem = (currentMessages) => {
    // Use no-block prompt if there is already chat history (ongoing conversation)
    const hasHistory = (currentMessages || []).filter(m => m.role === "user").length > 1;
    let sys = hasHistory ? SYSTEM_ONGOING : SYSTEM_FIRST;
    const mode = EXPERT_MODES.find(m => m.id === activeMode);
    if (mode) sys += `\n\nACTIVE EXPERT MODE — ${mode.label}:\n${mode.prompt}`;
    const p = farmProfile;
    if (p.location || p.cropType || p.soilType || p.size || p.district || p.latitude) {
      sys += `\n\nFARMER PROFILE:\n- Location: ${p.location || "not set"}\n- District: ${p.district || "not set"}\n- GPS Coordinates: ${p.latitude && p.longitude ? p.latitude+", "+p.longitude : "not set"}\n- Crops: ${p.cropType || "not set"}\n- Soil: ${p.soilType || "not set"}\n- Farm Size: ${p.size || "not set"}`;
    }
    sys += `\n\nWEATHER MONITORING LOCATION: ${weatherCity.name}, ${weatherCity.province} (Lat: ${weatherCity.lat}, Lng: ${weatherCity.lng})`;
    return sys;
  };

  const sendMessage = async (text) => {
    const msg = text !== undefined ? text : input.trim();
    if (!msg || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }
    if (isMobile) setSidebarOpen(false);

    // ── Export trigger detection ──
    const msgLower = msg.toLowerCase();
    const hasChatToExport = messages.filter(m => m.role === "user").length > 0;

    const pdfPatterns = [
      /export.*(pdf|print)/i, /convert.*(pdf|print)/i, /save.*pdf/i,
      /download.*pdf/i, /generate.*pdf/i, /make.*pdf/i,
      /chat.*pdf/i, /pdf.*chat/i, /pdf.*export/i, /get.*pdf/i,
    ];
    const docxPatterns = [
      /export.*(docx|word|doc)/i, /convert.*(docx|word|doc)/i,
      /save.*(docx|word|doc)/i, /download.*(docx|word|doc)/i,
      /generate.*(docx|word|doc)/i, /make.*(docx|word|doc)/i,
      /chat.*(docx|word|doc)/i, /(docx|word|doc).*chat/i, /get.*(docx|word|doc)/i,
    ];
    const exportAnyPatterns = [
      /export\s*(this\s*)?(chat|conversation)?$/i,
      /save\s*(this\s*)?(chat|conversation)/i,
      /download\s*(this\s*)?(chat|conversation)/i,
    ];

    if (hasChatToExport && pdfPatterns.some(p => p.test(msg))) {
      setInput("");
      setMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: "📕 **Generating PDF...** Your browser print dialog will open — choose **Save as PDF** as the destination." }]);
      setTimeout(() => exportToPDF(), 400);
      return;
    }
    if (hasChatToExport && docxPatterns.some(p => p.test(msg))) {
      setInput("");
      setMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: "📄 **Downloading Word document...** Your `.docx` file will download shortly and can be opened in Microsoft Word or Google Docs." }]);
      setTimeout(() => exportToDocx(), 400);
      return;
    }
    if (hasChatToExport && exportAnyPatterns.some(p => p.test(msg))) {
      setInput("");
      setMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: "📤 **Export options:** Which format would you like?\n\n- Type **export as PDF** for a PDF file\n- Type **export as Word** for a .docx file" }]);
      return;
    }

    // JS-level block: only applies when there are no prior user messages (first message)
    const priorUserMsgs = messages.filter(m => m.role === "user").length;
    if (priorUserMsgs === 0 && OFFTOPIC_PATTERNS.some(p => p.test(msg))) {
      setMessages(prev => [...prev, { role: "user", content: msg }, { role: "assistant", content: "🌾🚫🤖" }]);
      setInput("");
      return;
    }

    const userMsg = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setStreamText("");

    const apiMsgs = newMessages.slice(-14).map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: "system", content: buildSystem(newMessages) }, ...apiMsgs],
          temperature: 0.7,
          max_tokens: 2048,
          stream: true
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content || "";
            full += delta;
            setStreamText(full);
          } catch {}
        }
      }

      setMessages([...newMessages, { role: "assistant", content: full }]);
      setStreamText("");
    } catch (err) {
      const errMsg = err.message.includes("401")
        ? "❌ **Invalid API Key.** Please check your Groq key and try again."
        : err.message.includes("429")
        ? "⏳ **Rate limit reached.** Please wait a moment and try again."
        : `❌ **Error:** ${err.message}`;
      setMessages(prev => [...prev, { role: "assistant", content: errMsg }]);
      setStreamText("");
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    const firstUserMsg = messages.find(m => m.role === "user");
    if (firstUserMsg) {
      const newSaved = [...savedChats, { id: Date.now(), title: firstUserMsg.content.slice(0, 42), msgs: messages }].slice(-20);
      setSavedChats(newSaved);
      localStorage.setItem("agrimind_chats", JSON.stringify(newSaved));
    }
    setMessages([{ role: "assistant", content: "🌱 New session started. Ask me anything about farming!" }]);
    if (isMobile) setSidebarOpen(false);
  };

  // ── Image Upload for Pest/Disease Identification ──
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please upload an image file (JPG, PNG, WEBP)."); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      const base64 = dataUrl.split(",")[1];
      setPestImage({ dataUrl, base64, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const sendImageMessage = async () => {
    if (!pestImage || loading) return;
    if (!apiKey) { setShowKeyModal(true); return; }
    if (isMobile) setSidebarOpen(false);

    const caption = input.trim() || "Please identify any pests, diseases, or nutrient deficiencies visible in this crop/plant image. Provide: 1) Identification 2) Severity 3) Recommended treatment.";
    const userDisplayMsg = { role: "user", content: `📷 **Image uploaded:** ${pestImage.name}\n\n${caption}` };
    const newMessages = [...messages, userDisplayMsg];
    setMessages(newMessages);
    setInput("");
    setPestImage(null);
    setLoading(true);
    setStreamText("");

    const apiMsgs = [
      ...newMessages.slice(-13).slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      {
        role: "user",
        content: [
          { type: "image_url", image_url: { url: `data:${pestImage.mimeType};base64,${pestImage.base64}` } },
          { type: "text", text: caption }
        ]
      }
    ];

    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [{ role: "system", content: buildSystem(newMessages) }, ...apiMsgs],
          temperature: 0.6,
          max_tokens: 2048,
          stream: true
        })
      });

      if (!res.ok) { const err = await res.json(); throw new Error(err.error?.message || `HTTP ${res.status}`); }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;
          try { const json = JSON.parse(data); const delta = json.choices?.[0]?.delta?.content || ""; full += delta; setStreamText(full); } catch {}
        }
      }
      setMessages([...newMessages, { role: "assistant", content: full }]);
      setStreamText("");
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ **Image analysis error:** ${err.message}` }]);
      setStreamText("");
    } finally {
      setLoading(false);
    }
  };

  // ── md renderer (defined first so export functions can use it) ──
  const md = (text) => (text || "")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, '<code style="background:rgba(0,0,0,0.12);padding:1px 6px;border-radius:4px;font-size:0.87em;font-family:monospace">$1</code>')
    .replace(/^### (.+)$/gm, '<div style="font-weight:700;font-size:0.97em;margin:10px 0 3px">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:1.04em;margin:12px 0 4px">$1</div>')
    .replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:1.1em;margin:12px 0 5px">$1</div>')
    .replace(/^- (.+)$/gm, '<li style="margin:3px 0">$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:3px 0;list-style-type:decimal">$1</li>')
    .replace(/(<li[^>]*>.*?<\/li>\n?)+/gs, s => `<ul style="margin:6px 0;padding-left:22px">${s}</ul>`)
    .replace(/\n\n/g, "<br/><br/>").replace(/\n/g, "<br/>");

  // strip HTML tags to get plain text for docx
  const stripHtml = (html) => (html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(div|p|ul|li)[^>]*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&nbsp;/g," ")
    .replace(/\n{3,}/g, "\n\n").trim();

  // ── Export Functions ──

  // Pure-JS minimal zip builder — no CDN needed
  const buildDocxBlob = (filesMap) => {
    // CRC32 table
    const crcTable = (() => {
      const t = new Uint32Array(256);
      for (let i = 0; i < 256; i++) {
        let c = i;
        for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        t[i] = c;
      }
      return t;
    })();
    const crc32 = (data) => {
      let c = 0xFFFFFFFF;
      for (let i = 0; i < data.length; i++) c = crcTable[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
      return (c ^ 0xFFFFFFFF) >>> 0;
    };
    const enc = new TextEncoder();
    const entries = Object.entries(filesMap).map(([name, content]) => {
      const nameBytes = enc.encode(name);
      const dataBytes = enc.encode(content);
      const crc = crc32(dataBytes);
      return { name, nameBytes, dataBytes, crc };
    });

    // Build local file entries
    const localParts = [];
    const offsets = [];
    let offset = 0;
    for (const e of entries) {
      offsets.push(offset);
      const lh = new Uint8Array(30 + e.nameBytes.length);
      const view = new DataView(lh.buffer);
      view.setUint32(0, 0x04034b50, true); // sig
      view.setUint16(4, 20, true);          // version needed
      view.setUint16(6, 0, true);           // flags
      view.setUint16(8, 0, true);           // compression: stored
      view.setUint16(10, 0, true);          // mod time
      view.setUint16(12, 0, true);          // mod date
      view.setUint32(14, e.crc, true);
      view.setUint32(18, e.dataBytes.length, true);
      view.setUint32(22, e.dataBytes.length, true);
      view.setUint16(26, e.nameBytes.length, true);
      view.setUint16(28, 0, true);
      lh.set(e.nameBytes, 30);
      localParts.push(lh, e.dataBytes);
      offset += lh.length + e.dataBytes.length;
    }

    // Central directory
    const cdParts = [];
    let cdSize = 0;
    const cdOffset = offset;
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      const cd = new Uint8Array(46 + e.nameBytes.length);
      const view = new DataView(cd.buffer);
      view.setUint32(0, 0x02014b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 20, true);
      view.setUint16(8, 0, true);
      view.setUint16(10, 0, true);
      view.setUint16(12, 0, true);
      view.setUint16(14, 0, true);
      view.setUint32(16, e.crc, true);
      view.setUint32(20, e.dataBytes.length, true);
      view.setUint32(24, e.dataBytes.length, true);
      view.setUint16(28, e.nameBytes.length, true);
      view.setUint16(30, 0, true);
      view.setUint16(32, 0, true);
      view.setUint16(34, 0, true);
      view.setUint16(36, 0, true);
      view.setUint32(38, 0, true);
      view.setUint32(42, offsets[i], true);
      cd.set(e.nameBytes, 46);
      cdParts.push(cd);
      cdSize += cd.length;
    }

    // End of central directory
    const eocd = new Uint8Array(22);
    const eocdView = new DataView(eocd.buffer);
    eocdView.setUint32(0, 0x06054b50, true);
    eocdView.setUint16(4, 0, true);
    eocdView.setUint16(6, 0, true);
    eocdView.setUint16(8, entries.length, true);
    eocdView.setUint16(10, entries.length, true);
    eocdView.setUint32(12, cdSize, true);
    eocdView.setUint32(16, cdOffset, true);
    eocdView.setUint16(20, 0, true);

    const allParts = [...localParts, ...cdParts, eocd];
    const totalLen = allParts.reduce((s, p) => s + p.length, 0);
    const result = new Uint8Array(totalLen);
    let pos = 0;
    for (const p of allParts) { result.set(p, pos); pos += p.length; }
    return new Blob([result], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
  };

  const exportToDocx = () => {
    setExportLoading(true);
    try {
      // Build OOXML paragraphs from messages
      const xmlEsc = (s) => (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");

      const makePara = (text, bold = false, color = "1b4332", size = "22") => {
        const lines = text.split("\n");
        return lines.map(line => {
          const escaped = xmlEsc(line);
          return `<w:p><w:pPr><w:spacing w:after="100"/></w:pPr><w:r><w:rPr>${bold ? "<w:b/>" : ""}<w:color w:val="${color}"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
        }).join("");
      };

      let paragraphs = "";
      // Title
      paragraphs += makePara("AgriMind - Chat Export", true, "1b4332", "32");
      paragraphs += makePara(`Exported: ${new Date().toLocaleString()}`, false, "4a7c59", "18");
      if (farmProfile.location) paragraphs += makePara(`Location: ${farmProfile.location}`, false, "4a7c59", "18");
      if (farmProfile.district) paragraphs += makePara(`District: ${farmProfile.district}`, false, "4a7c59", "18");
      if (farmProfile.cropType) paragraphs += makePara(`Crops: ${farmProfile.cropType}`, false, "4a7c59", "18");
      paragraphs += makePara("─".repeat(50), false, "9dd4a8", "18");
      paragraphs += `<w:p/>`;

      messages.forEach(msg => {
        const isAI = msg.role === "assistant";
        const label = isAI ? "🌾 AgriMind" : "👨‍🌾 Farmer";
        paragraphs += makePara(label, true, isAI ? "1b4332" : "2d6a4f", "22");
        const plainText = isAI ? stripHtml(md(msg.content)) : (msg.content || "");
        paragraphs += makePara(plainText, false, "222222", "22");
        paragraphs += makePara("─".repeat(40), false, "c3e6cb", "16");
        paragraphs += `<w:p/>`;
      });

      const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
</w:body></w:document>`;

      const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

      const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

      const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

      const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
</w:styles>`;

      const blob = buildDocxBlob({
        "[Content_Types].xml": contentTypesXml,
        "_rels/.rels": relsXml,
        "word/document.xml": docXml,
        "word/_rels/document.xml.rels": wordRelsXml,
        "word/styles.xml": stylesXml,
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AgriMind_Chat_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("DOCX export failed: " + err.message);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const exportToPDF = () => {
    setExportLoading(true);
    try {
      const printWindow = window.open("", "_blank");
      if (!printWindow) { alert("Please allow popups for this site to export PDF."); setExportLoading(false); return; }
      const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>AgriMind Chat Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 30px; color: #1b4332; background: #fff; }
    h1 { color: #1b4332; border-bottom: 3px solid #40916c; padding-bottom: 10px; margin-bottom: 6px; font-size: 22px; }
    .meta { color: #4a7c59; font-size: 12px; margin-bottom: 24px; line-height: 1.8; }
    .message { margin-bottom: 16px; border-radius: 10px; overflow: hidden; page-break-inside: avoid; }
    .msg-header { padding: 7px 14px; font-weight: 700; font-size: 12px; }
    .msg-body { padding: 11px 15px; font-size: 13px; line-height: 1.75; white-space: pre-wrap; }
    .assistant .msg-header { background: #1b4332; color: #fff; }
    .assistant .msg-body { background: #f0f7f1; border: 1px solid #c3e6cb; border-top: none; }
    .user .msg-header { background: #2d6a4f; color: #fff; }
    .user .msg-body { background: #e8f5eb; border: 1px solid #9dd4a8; border-top: none; }
    .divider { border: none; border-top: 1px dashed #9dd4a8; margin: 10px 0; }
    strong { font-weight: 700; }
    ul { padding-left: 20px; margin: 4px 0; }
    li { margin: 2px 0; }
    @media print { body { padding: 15px; } .message { page-break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>🌾 AgriMind Chat Export</h1>
  <div class="meta">
    Exported: ${new Date().toLocaleString()}<br/>
    ${farmProfile.location ? `Location: ${farmProfile.location}<br/>` : ""}
    ${farmProfile.district ? `District: ${farmProfile.district}<br/>` : ""}
    ${farmProfile.cropType ? `Crops: ${farmProfile.cropType}` : ""}
  </div>
  ${messages.map(msg => `
  <div class="message ${msg.role}">
    <div class="msg-header">${msg.role === "assistant" ? "🌾 AgriMind" : "👨‍🌾 Farmer"}</div>
    <div class="msg-body">${md(msg.content)}</div>
  </div>`).join('<hr class="divider"/>')}
</body>
</html>`;
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); }, 800);
    } catch (err) {
      alert("PDF export failed: " + err.message);
    } finally {
      setExportLoading(false);
      setShowExportModal(false);
    }
  };

  const activeModeObj = EXPERT_MODES.find(m => m.id === activeMode);

  const C = {
    bg:          darkMode ? "#0b1f12" : "#f0f7f1",
    sidebar:     darkMode ? "#081510" : "#ffffff",
    border:      darkMode ? "#1a3a22" : "#d0ead4",
    header:      darkMode ? "#081510" : "#1b4332",
    text:        darkMode ? "#e0f0e4" : "#1b4332",
    muted:       darkMode ? "#6dbf7e" : "#4a7c59",
    accent:      "#40916c",
    accentDark:  "#2d6a4f",
    userBg:      "#2d6a4f",
    aiBg:        darkMode ? "#0f2a17" : "#ffffff",
    aiBorder:    darkMode ? "#1a4a2a" : "#c3e6cb",
    chip:        darkMode ? "#0f2a17" : "#e8f5eb",
    chipBorder:  darkMode ? "#2d6a4f" : "#9dd4a8",
    inputBg:     darkMode ? "#081510" : "#ffffff",
    inputBorder: darkMode ? "#2d6a4f" : "#b0d8ba",
    modalBg:     darkMode ? "#0b1f12" : "#ffffff",
    overlay:     "rgba(0,0,0,0.5)",
  };

  return (
    <div style={{ display:"flex", height:"100dvh", background:C.bg, fontFamily:"'Segoe UI',system-ui,sans-serif", color:C.text, overflow:"hidden", position:"relative" }}>

      {/* Weather popup backdrop (desktop only – mobile handled inline) */}
      {showWeatherPopup && !isMobile && (
        <div style={{ position:"fixed", inset:0, zIndex:199 }} onClick={() => setShowWeatherPopup(false)} />
      )}

      {/* ── API Key Modal ── */}
      {showKeyModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.modalBg, borderRadius:18, padding:28, width:"100%", maxWidth:420, border:`2px solid ${C.accent}` }}>
            <div style={{ textAlign:"center", marginBottom:6, fontSize:40 }}>🌾</div>
            <h2 style={{ textAlign:"center", margin:"0 0 6px", color:C.accentDark, fontSize:20 }}>AgriMind</h2>
            <p style={{ textAlign:"center", color:C.muted, fontSize:13, margin:"0 0 18px" }}>Powered by <strong>Groq + Llama 3</strong> — 100% Free</p>
            <div style={{ background:darkMode?"#0f2a17":"#e8f5eb", borderRadius:10, padding:"12px 14px", marginBottom:16, fontSize:13, color:C.muted, lineHeight:1.7 }}>
              <strong style={{ color:C.accentDark }}>Get your free Groq API key:</strong><br/>
              1. Go to <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" style={{ color:C.accent }}>console.groq.com/keys</a><br/>
              2. Sign up free → Create API Key → Copy ✅
            </div>
            <input type="password" placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx" value={keyInput}
              onChange={e => setKeyInput(e.target.value)} onKeyDown={e => e.key === "Enter" && saveKey()} autoFocus
              style={{ width:"100%", padding:"12px 16px", borderRadius:10, border:`1.5px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:14, boxSizing:"border-box", outline:"none", marginBottom:12 }} />
            <button onClick={saveKey} disabled={!keyInput.trim()}
              style={{ width:"100%", padding:"13px", borderRadius:10, background:C.accentDark, color:"#fff", border:"none", fontSize:15, fontWeight:700, cursor:"pointer", opacity:keyInput.trim()?1:0.5 }}>
              🚀 Start AgriMind
            </button>
            <p style={{ textAlign:"center", fontSize:11, color:C.muted, marginTop:10 }}>14,400 free requests/day • No credit card needed</p>
          </div>
        </div>
      )}

      {/* ── Farm Profile Modal ── */}
      {showProfile && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.modalBg, borderRadius:16, padding:24, width:"100%", maxWidth:400, border:`1.5px solid ${C.accent}`, maxHeight:"90dvh", overflowY:"auto" }}>
            <h3 style={{ margin:"0 0 4px", color:C.accentDark, fontSize:16 }}>🌿 Your Farm Profile</h3>
            <p style={{ fontSize:12, color:C.muted, margin:"0 0 14px" }}>Helps AgriMind give personalized advice.</p>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>📍 Location / City</label>
              <input value={farmProfile.location} onChange={e => setFarmProfile(p => ({...p, location: e.target.value}))} placeholder="e.g. Multan, Punjab"
                style={{ width:"100%", padding:"10px 13px", borderRadius:8, border:`1.5px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:14, boxSizing:"border-box", outline:"none" }} />
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>🗺️ District</label>
              <select value={farmProfile.district} onChange={e => setFarmProfile(p => ({...p, district: e.target.value}))}
                style={{ width:"100%", padding:"10px 13px", borderRadius:8, border:`1.5px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:14, boxSizing:"border-box", outline:"none", cursor:"pointer" }}>
                <option value="">— Select District —</option>
                {PAKISTAN_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>🌐 GPS Coordinates <span style={{ fontWeight:400, fontSize:11 }}>(optional)</span></label>
              <div style={{ display:"flex", gap:8 }}>
                <input value={farmProfile.latitude} onChange={e => setFarmProfile(p => ({...p, latitude: e.target.value}))} placeholder="Latitude e.g. 30.1575"
                  style={{ flex:1, padding:"10px 11px", borderRadius:8, border:`1.5px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:13, boxSizing:"border-box", outline:"none" }} />
                <input value={farmProfile.longitude} onChange={e => setFarmProfile(p => ({...p, longitude: e.target.value}))} placeholder="Longitude e.g. 71.5249"
                  style={{ flex:1, padding:"10px 11px", borderRadius:8, border:`1.5px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:13, boxSizing:"border-box", outline:"none" }} />
              </div>
              <button onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition(pos => {
                    setFarmProfile(p => ({...p, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6)}));
                  }, () => alert("Location access denied."));
                }
              }} style={{ marginTop:6, padding:"6px 12px", borderRadius:7, background:C.chip, border:`1px solid ${C.chipBorder}`, color:C.muted, cursor:"pointer", fontSize:12 }}>
                📡 Use My Current Location
              </button>
            </div>

            {[
              ["cropType", "🌾 Current Crops",  "e.g. Wheat, Cotton, Rice"],
              ["soilType", "🪨 Soil Type",       "e.g. Sandy Loam, Clay"],
              ["size",     "📐 Farm Size",       "e.g. 10 acres"]
            ].map(([key, label, ph]) => (
              <div key={key} style={{ marginBottom:12 }}>
                <label style={{ fontSize:12, fontWeight:600, color:C.muted, display:"block", marginBottom:4 }}>{label}</label>
                <input value={farmProfile[key]} onChange={e => setFarmProfile(p => ({...p, [key]: e.target.value}))} placeholder={ph}
                  style={{ width:"100%", padding:"10px 13px", borderRadius:8, border:`1.5px solid ${C.inputBorder}`, background:C.inputBg, color:C.text, fontSize:14, boxSizing:"border-box", outline:"none" }} />
              </div>
            ))}

            <div style={{ display:"flex", gap:10, marginTop:8 }}>
              <button onClick={() => setShowProfile(false)} style={{ flex:1, padding:"11px", borderRadius:9, background:C.accentDark, color:"#fff", border:"none", fontWeight:700, cursor:"pointer", fontSize:14 }}>✅ Save Profile</button>
              <button onClick={() => setShowProfile(false)} style={{ padding:"11px 18px", borderRadius:9, background:"transparent", color:C.muted, border:`1.5px solid ${C.inputBorder}`, cursor:"pointer", fontSize:14 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Weather City Modal ── */}
      {showWeatherCity && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.modalBg, borderRadius:16, padding:24, width:"100%", maxWidth:380, border:`1.5px solid ${C.accent}`, maxHeight:"85dvh", overflowY:"auto" }}>
            <h3 style={{ margin:"0 0 4px", color:C.accentDark, fontSize:16 }}>🌦️ Weather Monitoring City</h3>
            <p style={{ fontSize:12, color:C.muted, margin:"0 0 14px" }}>Select city for weather-based crop advice. Default: Multan.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6, maxHeight:"55dvh", overflowY:"auto", paddingRight:4 }}>
              {Object.entries(
                PAKISTAN_CITIES.reduce((acc, c) => { (acc[c.province] = acc[c.province]||[]).push(c); return acc; }, {})
              ).map(([province, cities]) => (
                <div key={province}>
                  <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, margin:"8px 0 4px", paddingLeft:4 }}>{province}</div>
                  {cities.map(city => (
                    <button key={city.name} onClick={() => {
                      setWeatherCity(city);
                      localStorage.setItem("agrimind_weather_city", JSON.stringify(city));
                      setShowWeatherCity(false);
                    }}
                      style={{ width:"100%", padding:"9px 12px", borderRadius:9, border:`1.5px solid ${weatherCity.name===city.name ? C.accentDark : C.chipBorder}`, background:weatherCity.name===city.name ? C.accentDark : C.chip, color:weatherCity.name===city.name ? "#fff" : C.text, cursor:"pointer", fontSize:13, fontWeight:weatherCity.name===city.name?700:400, textAlign:"left", marginBottom:3, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span>{city.name}</span>
                      <span style={{ fontSize:10, opacity:0.6 }}>{city.lat.toFixed(2)}, {city.lng.toFixed(2)}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <button onClick={() => setShowWeatherCity(false)} style={{ width:"100%", marginTop:14, padding:"11px", borderRadius:9, background:"transparent", color:C.muted, border:`1.5px solid ${C.inputBorder}`, cursor:"pointer", fontSize:14 }}>Close</button>
          </div>
        </div>
      )}

      {/* ── Export Modal ── */}
      {showExportModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:C.modalBg, borderRadius:16, padding:24, width:"100%", maxWidth:360, border:`1.5px solid ${C.accent}` }}>
            <h3 style={{ margin:"0 0 6px", color:C.accentDark, fontSize:17 }}>📤 Export Chat</h3>
            <p style={{ fontSize:13, color:C.muted, margin:"0 0 20px", lineHeight:1.6 }}>Save your AgriMind conversation as a document for future reference or sharing.</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              <button onClick={exportToDocx} disabled={exportLoading}
                style={{ padding:"14px 16px", borderRadius:12, background:C.accentDark, color:"#fff", border:"none", cursor:exportLoading?"not-allowed":"pointer", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap:10, opacity:exportLoading?0.7:1 }}>
                <span style={{ fontSize:24 }}>📄</span>
                <div style={{ textAlign:"left" }}>
                  <div>Download as Word (.docx)</div>
                  <div style={{ fontSize:11, opacity:0.75, fontWeight:400 }}>Opens in Microsoft Word, Google Docs</div>
                </div>
              </button>
              <button onClick={exportToPDF} disabled={exportLoading}
                style={{ padding:"14px 16px", borderRadius:12, background:"#c0392b", color:"#fff", border:"none", cursor:exportLoading?"not-allowed":"pointer", fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap:10, opacity:exportLoading?0.7:1 }}>
                <span style={{ fontSize:24 }}>📕</span>
                <div style={{ textAlign:"left" }}>
                  <div>Download as PDF</div>
                  <div style={{ fontSize:11, opacity:0.75, fontWeight:400 }}>Print-ready format via browser</div>
                </div>
              </button>
            </div>
            <div style={{ marginTop:14, fontSize:11, color:C.muted, background:darkMode?"#0f2a17":"#e8f5eb", borderRadius:8, padding:"8px 12px", lineHeight:1.6 }}>
              💡 <strong>Tip:</strong> For PDF, your browser's print dialog will open. Choose "Save as PDF" as the destination.
            </div>
            <button onClick={() => setShowExportModal(false)} style={{ width:"100%", marginTop:14, padding:"11px", borderRadius:9, background:"transparent", color:C.muted, border:`1.5px solid ${C.inputBorder}`, cursor:"pointer", fontSize:14 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Expert Mode Bottom Sheet (mobile) ── */}
      {showModeSheet && isMobile && (
        <div style={{ position:"fixed", inset:0, zIndex:998, display:"flex", flexDirection:"column", justifyContent:"flex-end" }}>
          <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.5)" }} onClick={() => setShowModeSheet(false)} />
          <div style={{ position:"relative", background:C.sidebar, borderRadius:"20px 20px 0 0", padding:"16px 16px 32px", maxHeight:"75dvh", overflowY:"auto" }}>
            <div style={{ width:40, height:4, background:C.chipBorder, borderRadius:2, margin:"0 auto 16px" }} />
            <div style={{ fontSize:13, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.9, marginBottom:10 }}>Expert Modes</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {EXPERT_MODES.map(mode => (
                <button key={mode.id} onClick={() => { setActiveMode(activeMode === mode.id ? null : mode.id); setShowModeSheet(false); }}
                  style={{ padding:"12px 10px", borderRadius:12, border:`1.5px solid ${activeMode===mode.id ? C.accentDark : C.chipBorder}`, cursor:"pointer", textAlign:"left", display:"flex", alignItems:"center", gap:8, background:activeMode===mode.id ? C.accentDark : C.chip, color:activeMode===mode.id ? "#fff" : C.text }}>
                  <span style={{ fontSize:20 }}>{mode.icon}</span>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{mode.label}</div>
                    <div style={{ fontSize:10, opacity:0.6, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile sidebar overlay ── */}
      {isMobile && sidebarOpen && (
        <div style={{ position:"fixed", inset:0, background:C.overlay, zIndex:89 }} onClick={handleOverlayClick} />
      )}

      {/* ── Sidebar ── */}
      {sidebarOpen && (
        <div style={{
          width: 260,
          background: C.sidebar,
          borderRight: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          flexShrink: 0,
          // On mobile: fixed overlay drawer
          ...(isMobile ? { position:"fixed", top:0, left:0, height:"100dvh", zIndex:90, boxShadow:"4px 0 20px rgba(0,0,0,0.3)" } : {})
        }}>
          <div style={{ padding:"16px 14px 12px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:C.accentDark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🌾</div>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:C.accentDark }}>AgriMind</div>
                <div style={{ fontSize:10, color:C.muted }}>Free AI Farm Advisor</div>
              </div>
            </div>
            {isMobile && (
              <button onClick={() => setSidebarOpen(false)} style={{ background:"transparent", border:"none", color:C.muted, fontSize:22, cursor:"pointer", padding:4 }}>✕</button>
            )}
          </div>

          <div style={{ padding:"10px 12px 6px" }}>
            <label style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, display:"block", marginBottom:5 }}>AI Model</label>
            <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
              style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:`1px solid ${C.chipBorder}`, background:C.inputBg, color:C.text, fontSize:13, cursor:"pointer", outline:"none" }}>
              {GROQ_MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.desc}</option>)}
            </select>
          </div>

          <div style={{ padding:"6px 12px 4px" }}>
            <button onClick={clearChat} style={{ width:"100%", padding:"9px", borderRadius:10, background:"transparent", border:`1.5px solid ${C.accent}`, color:C.accent, fontWeight:700, fontSize:13, cursor:"pointer" }}>
              ✏️ New Chat
            </button>
          </div>

          <div style={{ padding:"6px 10px 8px", flex:1 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.9, margin:"4px 4px 7px" }}>Expert Modes</div>
            {EXPERT_MODES.map(mode => (
              <button key={mode.id} onClick={() => { setActiveMode(activeMode === mode.id ? null : mode.id); if (isMobile) setSidebarOpen(false); }}
                style={{ width:"100%", padding:"8px 9px", borderRadius:8, border:"none", cursor:"pointer", textAlign:"left", marginBottom:2, display:"flex", alignItems:"center", gap:9, background:activeMode===mode.id ? C.accentDark : "transparent", color:activeMode===mode.id ? "#fff" : C.text }}>
                <span style={{ fontSize:17, flexShrink:0 }}>{mode.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{mode.label}</div>
                  <div style={{ fontSize:10, opacity:0.65, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{mode.desc}</div>
                </div>
              </button>
            ))}
          </div>

          {savedChats.length > 0 && (
            <div style={{ padding:"6px 10px 6px", borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.9, margin:"4px 4px 7px" }}>Recent Chats</div>
              {savedChats.slice(-6).reverse().map(chat => (
                <button key={chat.id} onClick={() => { setMessages(chat.msgs); if (isMobile) setSidebarOpen(false); }}
                  style={{ width:"100%", padding:"6px 9px", borderRadius:7, border:"none", cursor:"pointer", textAlign:"left", background:"transparent", color:C.muted, fontSize:12, marginBottom:1, display:"block", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  💬 {chat.title}
                </button>
              ))}
            </div>
          )}

          <div style={{ padding:"10px 10px 16px", borderTop:`1px solid ${C.border}` }}>
            <button onClick={() => { setShowProfile(true); if (isMobile) setSidebarOpen(false); }}
              style={{ width:"100%", padding:"9px 10px", borderRadius:10, background:C.chip, border:`1px solid ${C.chipBorder}`, color:C.text, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
              <span>🌿</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontWeight:600, fontSize:12.5 }}>Farm Profile</div>
                <div style={{ fontSize:10, color:C.muted }}>{farmProfile.district || farmProfile.location || "Add your farm details"}</div>
              </div>
            </button>
            <button onClick={() => { setShowWeatherCity(true); if (isMobile) setSidebarOpen(false); }}
              style={{ width:"100%", padding:"9px 10px", borderRadius:10, background:C.chip, border:`1px solid ${C.chipBorder}`, color:C.text, cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", gap:9, marginBottom:7 }}>
              <span>🌦️</span>
              <div style={{ textAlign:"left" }}>
                <div style={{ fontWeight:600, fontSize:12.5 }}>Weather City</div>
                <div style={{ fontSize:10, color:C.muted }}>{weatherCity.name}, {weatherCity.province}</div>
              </div>
            </button>
            <button onClick={() => setDarkMode(!darkMode)}
              style={{ width:"100%", padding:"8px", borderRadius:8, background:"transparent", border:`1px solid ${C.chipBorder}`, color:C.muted, cursor:"pointer", fontSize:12 }}>
              {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>
            <button onClick={() => { setShowExportModal(true); if (isMobile) setSidebarOpen(false); }}
              disabled={messages.filter(m=>m.role==="user").length === 0}
              style={{ width:"100%", marginTop:6, padding:"8px", borderRadius:8, background:"transparent", border:`1px solid ${C.chipBorder}`, color:C.muted, cursor:"pointer", fontSize:12, opacity:messages.filter(m=>m.role==="user").length===0?0.4:1 }}>
              📤 Export Chat
            </button>
          </div>
        </div>
      )}

      {/* ── Main Chat ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>

        {/* Header */}
        {isMobile ? (
          /* ── MOBILE HEADER: two-row compact layout ── */
          <div style={{ background:C.header, flexShrink:0, boxShadow:"0 2px 10px rgba(0,0,0,0.3)" }}>
            {/* Row 1: menu | title | weather pill | profile */}
            <div style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 12px 6px" }}>
              <button onClick={() => setSidebarOpen(s => !s)}
                style={{ background:"transparent", border:"none", color:"#fff", cursor:"pointer", fontSize:22, padding:0, lineHeight:1, flexShrink:0 }}>☰</button>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ color:"#fff", fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                  {activeModeObj ? `${activeModeObj.icon} ${activeModeObj.label}` : "🌾 AgriMind"}
                </div>
              </div>
              {/* Compact weather pill */}
              <button onClick={() => setShowWeatherPopup(p => !p)}
                style={{ background:"rgba(255,255,255,0.14)", border:"1px solid rgba(255,255,255,0.22)", color:"#fff", cursor:"pointer", padding:"4px 8px", borderRadius:20, display:"flex", alignItems:"center", gap:4, fontSize:12, flexShrink:0 }}>
                <span style={{ fontSize:14 }}>{weatherLoading ? "⏳" : weather ? weather.icon : "🌡️"}</span>
                {weather && !weatherLoading && <span style={{ fontWeight:700, fontSize:12 }}>{weather.temp}°C</span>}
              </button>
              {/* Profile */}
              <button onClick={() => setShowProfile(true)}
                style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", cursor:"pointer", width:34, height:34, borderRadius:"50%", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                👨‍🌾
              </button>
              {/* Export */}
              {messages.filter(m=>m.role==="user").length > 0 && (
                <button onClick={() => setShowExportModal(true)} title="Export chat"
                  style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", cursor:"pointer", width:34, height:34, borderRadius:"50%", fontSize:15, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
                  📤
                </button>
              )}
            </div>
            {/* Row 2: mode selector + clear mode */}
            <div style={{ display:"flex", alignItems:"center", gap:6, padding:"0 12px 8px" }}>
              <button onClick={() => setShowModeSheet(true)}
                style={{ flex:1, background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.18)", color:"#fff", cursor:"pointer", padding:"5px 10px", borderRadius:20, fontSize:11, display:"flex", alignItems:"center", gap:5, overflow:"hidden" }}>
                <span>{activeModeObj ? activeModeObj.icon : "🔧"}</span>
                <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", fontWeight:500 }}>
                  {activeModeObj ? activeModeObj.label : "Select Expert Mode"}
                </span>
                <span style={{ marginLeft:"auto", opacity:0.6, fontSize:9 }}>▾</span>
              </button>
              {activeModeObj && (
                <button onClick={() => setActiveMode(null)}
                  style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", cursor:"pointer", width:28, height:28, borderRadius:"50%", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>✕</button>
              )}
              {loading && <div style={{ color:"#a5d6a7", fontSize:11, display:"flex", alignItems:"center", gap:4, flexShrink:0 }}><Dots /> Thinking…</div>}
            </div>
          </div>
        ) : (
          /* ── DESKTOP HEADER: single row ── */
          <div style={{ background:C.header, padding:"11px 14px", display:"flex", alignItems:"center", gap:10, flexShrink:0, boxShadow:"0 2px 10px rgba(0,0,0,0.3)" }}>
            <button onClick={() => setSidebarOpen(s => !s)} style={{ background:"transparent", border:"none", color:"#fff", cursor:"pointer", fontSize:22, padding:0, lineHeight:1, flexShrink:0 }}>☰</button>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ color:"#fff", fontWeight:700, fontSize:15, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {activeModeObj ? `${activeModeObj.icon} ${activeModeObj.label}` : "🌾 AgriMind"}
              </div>
              <div style={{ color:"rgba(255,255,255,0.55)", fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {activeModeObj ? activeModeObj.desc : `Groq + ${GROQ_MODELS.find(m => m.id === selectedModel)?.label}`}
              </div>
            </div>
            {/* Desktop weather widget */}
            <div style={{ position:"relative", flexShrink:0 }}>
              <button onClick={() => setShowWeatherPopup(p => !p)}
                style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.22)", color:"#fff", cursor:"pointer", padding:"6px 11px", borderRadius:10, display:"flex", alignItems:"center", gap:6, fontSize:12, backdropFilter:"blur(4px)" }}>
                {weatherLoading ? <span style={{ fontSize:13 }}>⏳</span> : weather ? (
                  <>
                    <span style={{ fontSize:17 }}>{weather.icon}</span>
                    <div style={{ textAlign:"left", lineHeight:1.25 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{weather.temp}°C</div>
                      <div style={{ fontSize:10, opacity:0.75 }}>{weatherCity.name}</div>
                    </div>
                    <div style={{ fontSize:10, opacity:0.65, lineHeight:1.3, textAlign:"left" }}>
                      <div>💧{weather.humidity}%</div>
                      <div>💨{weather.wind}km/h</div>
                    </div>
                  </>
                ) : <span style={{ fontSize:13 }}>🌡️</span>}
                <span style={{ fontSize:9, opacity:0.6, marginLeft:1 }}>▾</span>
              </button>
              {/* Desktop weather popup */}
              {showWeatherPopup && (
                <div style={{ position:"absolute", top:"calc(100% + 8px)", right:0, zIndex:200, background:C.modalBg, border:`1.5px solid ${C.accent}`, borderRadius:14, boxShadow:"0 8px 30px rgba(0,0,0,0.35)", width:290, overflow:"hidden" }}>
                  <div style={{ background:C.accentDark, padding:"12px 14px" }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div>
                        <div style={{ color:"#fff", fontWeight:700, fontSize:13 }}>📍 {weatherCity.name}</div>
                        <div style={{ color:"rgba(255,255,255,0.65)", fontSize:10 }}>{weatherCity.province}</div>
                      </div>
                      <button onClick={() => fetchWeather(weatherCity)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", borderRadius:7, padding:"4px 8px", fontSize:11, cursor:"pointer" }}>🔄 Refresh</button>
                    </div>
                    {weather && (
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:10 }}>
                        <span style={{ fontSize:34 }}>{weather.icon}</span>
                        <div>
                          <div style={{ color:"#fff", fontSize:26, fontWeight:800, lineHeight:1 }}>{weather.temp}°C</div>
                          <div style={{ color:"rgba(255,255,255,0.75)", fontSize:12 }}>{weather.desc}</div>
                        </div>
                        <div style={{ marginLeft:"auto", textAlign:"right" }}>
                          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:11 }}>💧 {weather.humidity}% Humidity</div>
                          <div style={{ color:"rgba(255,255,255,0.8)", fontSize:11 }}>💨 {weather.wind} km/h Wind</div>
                        </div>
                      </div>
                    )}
                    {weatherLoading && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:8 }}>Fetching weather…</div>}
                  </div>
                  <div style={{ padding:"10px 12px 4px" }}>
                    <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:6 }}>Change City</div>
                    <div style={{ maxHeight:180, overflowY:"auto", display:"flex", flexDirection:"column", gap:3 }}>
                      {Object.entries(PAKISTAN_CITIES.reduce((acc, c) => { (acc[c.province]=acc[c.province]||[]).push(c); return acc; }, {})).map(([province, cities]) => (
                        <div key={province}>
                          <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7, padding:"4px 4px 2px" }}>{province}</div>
                          {cities.map(city => (
                            <button key={city.name} onClick={() => { setWeatherCity(city); localStorage.setItem("agrimind_weather_city", JSON.stringify(city)); setShowWeatherPopup(false); }}
                              style={{ width:"100%", padding:"6px 10px", borderRadius:7, border:`1px solid ${weatherCity.name===city.name ? C.accentDark : "transparent"}`, background:weatherCity.name===city.name ? C.accentDark : "transparent", color:weatherCity.name===city.name ? "#fff" : C.text, cursor:"pointer", fontSize:12, fontWeight:weatherCity.name===city.name?600:400, textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <span>{city.name}</span>
                              {weatherCity.name===city.name && <span style={{ fontSize:10 }}>✓</span>}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ padding:"8px 12px 12px" }}>
                    <button onClick={() => setShowWeatherPopup(false)} style={{ width:"100%", padding:"8px", borderRadius:8, background:"transparent", border:`1px solid ${C.chipBorder}`, color:C.muted, cursor:"pointer", fontSize:12 }}>Close</button>
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setShowProfile(true)}
              style={{ background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.25)", color:"#fff", cursor:"pointer", width:36, height:36, borderRadius:"50%", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              👨‍🌾
            </button>
            {activeModeObj && (
              <button onClick={() => setActiveMode(null)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", cursor:"pointer", padding:"5px 10px", borderRadius:7, fontSize:12, flexShrink:0 }}>✕</button>
            )}
            {messages.filter(m=>m.role==="user").length > 0 && (
              <button onClick={() => setShowExportModal(true)} title="Export chat"
                style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.22)", color:"#fff", cursor:"pointer", padding:"6px 11px", borderRadius:10, fontSize:12, display:"flex", alignItems:"center", gap:5, flexShrink:0 }}>
                📤 Export
              </button>
            )}
            {loading && <div style={{ color:"#a5d6a7", fontSize:12, display:"flex", alignItems:"center", gap:5, flexShrink:0 }}><Dots /> Thinking</div>}
          </div>
        )}

        {/* Mobile weather popup — fixed, centered, won't go off-screen */}
        {isMobile && showWeatherPopup && (
          <div style={{ position:"fixed", inset:0, zIndex:500, display:"flex", alignItems:"flex-start", justifyContent:"center", paddingTop:90, paddingLeft:12, paddingRight:12 }}
            onClick={() => setShowWeatherPopup(false)}>
            <div style={{ background:C.modalBg, border:`1.5px solid ${C.accent}`, borderRadius:16, boxShadow:"0 12px 40px rgba(0,0,0,0.45)", width:"100%", maxWidth:340, overflow:"hidden" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ background:C.accentDark, padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div style={{ color:"#fff", fontWeight:700, fontSize:14 }}>📍 {weatherCity.name}</div>
                    <div style={{ color:"rgba(255,255,255,0.65)", fontSize:11 }}>{weatherCity.province}</div>
                  </div>
                  <div style={{ display:"flex", gap:6 }}>
                    <button onClick={() => fetchWeather(weatherCity)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>🔄</button>
                    <button onClick={() => setShowWeatherPopup(false)} style={{ background:"rgba(255,255,255,0.15)", border:"none", color:"#fff", borderRadius:8, padding:"5px 10px", fontSize:12, cursor:"pointer" }}>✕</button>
                  </div>
                </div>
                {weather && (
                  <div style={{ display:"flex", alignItems:"center", gap:12, marginTop:12 }}>
                    <span style={{ fontSize:40 }}>{weather.icon}</span>
                    <div>
                      <div style={{ color:"#fff", fontSize:30, fontWeight:800, lineHeight:1 }}>{weather.temp}°C</div>
                      <div style={{ color:"rgba(255,255,255,0.75)", fontSize:13 }}>{weather.desc}</div>
                    </div>
                    <div style={{ marginLeft:"auto", textAlign:"right" }}>
                      <div style={{ color:"rgba(255,255,255,0.85)", fontSize:12 }}>💧 {weather.humidity}%</div>
                      <div style={{ color:"rgba(255,255,255,0.85)", fontSize:12 }}>💨 {weather.wind} km/h</div>
                    </div>
                  </div>
                )}
                {weatherLoading && <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, marginTop:8 }}>Fetching weather…</div>}
              </div>
              <div style={{ padding:"10px 14px 6px" }}>
                <div style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.8, marginBottom:8 }}>Change City</div>
                <div style={{ maxHeight:220, overflowY:"auto", display:"flex", flexDirection:"column", gap:2 }}>
                  {Object.entries(PAKISTAN_CITIES.reduce((acc, c) => { (acc[c.province]=acc[c.province]||[]).push(c); return acc; }, {})).map(([province, cities]) => (
                    <div key={province}>
                      <div style={{ fontSize:9, fontWeight:700, color:C.muted, textTransform:"uppercase", letterSpacing:0.7, padding:"6px 4px 2px" }}>{province}</div>
                      {cities.map(city => (
                        <button key={city.name} onClick={() => { setWeatherCity(city); localStorage.setItem("agrimind_weather_city", JSON.stringify(city)); setShowWeatherPopup(false); }}
                          style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${weatherCity.name===city.name ? C.accentDark : "transparent"}`, background:weatherCity.name===city.name ? C.accentDark : "transparent", color:weatherCity.name===city.name ? "#fff" : C.text, cursor:"pointer", fontSize:13, fontWeight:weatherCity.name===city.name?600:400, textAlign:"left", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span>{city.name}</span>
                          {weatherCity.name===city.name && <span style={{ fontSize:11 }}>✓</span>}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ padding:"8px 14px 14px" }}>
                <button onClick={() => setShowWeatherPopup(false)} style={{ width:"100%", padding:"10px", borderRadius:10, background:"transparent", border:`1px solid ${C.chipBorder}`, color:C.muted, cursor:"pointer", fontSize:13 }}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding: isMobile ? "12px 10px" : "16px 14px", display:"flex", flexDirection:"column", gap:12 }}>
          {messages.map((msg, i) => (
            <div key={i} style={{ display:"flex", justifyContent:msg.role==="user"?"flex-end":"flex-start", alignItems:"flex-start", gap:8 }}>
              {msg.role==="assistant" && (
                <div style={{ width:32, height:32, borderRadius:"50%", background:C.accentDark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, marginTop:2 }}>🌾</div>
              )}
              <div style={{ maxWidth: isMobile ? "85%" : "78%", borderRadius:msg.role==="user"?"18px 18px 4px 18px":"4px 18px 18px 18px", padding:"10px 14px", background:msg.role==="user"?C.userBg:C.aiBg, color:msg.role==="user"?"#fff":C.text, border:msg.role==="user"?"none":`1px solid ${C.aiBorder}`, fontSize: isMobile ? 14 : 14, lineHeight:1.65, wordBreak:"break-word" }}>
                <div dangerouslySetInnerHTML={{ __html: md(msg.content) }} />
              </div>
              {msg.role==="user" && (
                <div style={{ width:32, height:32, borderRadius:"50%", background:"#95d5a8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, marginTop:2 }}>👨‍🌾</div>
              )}
            </div>
          ))}

          {(loading && streamText) && (
            <div style={{ display:"flex", justifyContent:"flex-start", alignItems:"flex-start", gap:8 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.accentDark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, flexShrink:0, marginTop:2 }}>🌾</div>
              <div style={{ maxWidth: isMobile ? "85%" : "78%", borderRadius:"4px 18px 18px 18px", padding:"10px 14px", background:C.aiBg, color:C.text, border:`1px solid ${C.aiBorder}`, fontSize:14, lineHeight:1.65, wordBreak:"break-word" }}>
                <div dangerouslySetInnerHTML={{ __html: md(streamText) }} />
                <span style={{ display:"inline-block", width:7, height:15, background:C.accent, borderRadius:2, marginLeft:2, verticalAlign:"text-bottom", animation:"blink 0.9s infinite" }} />
              </div>
            </div>
          )}

          {(loading && !streamText) && (
            <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:C.accentDark, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>🌾</div>
              <div style={{ padding:"12px 16px", background:C.aiBg, border:`1px solid ${C.aiBorder}`, borderRadius:"4px 18px 18px 18px" }}>
                <Dots color={C.accent} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick chips */}
        {messages.length <= 2 && (
          <div style={{ padding:"2px 10px 6px", display:"flex", flexWrap:"wrap", gap:6, overflowX: isMobile ? "auto" : "unset" }}>
            {QUICK_CHIPS.map(chip => (
              <button key={chip} onClick={() => sendMessage(chip)}
                style={{ padding:"6px 12px", borderRadius:20, background:C.chip, border:`1px solid ${C.chipBorder}`, color:C.text, fontSize:12, cursor:"pointer", fontWeight:500, whiteSpace:"nowrap" }}>
                {chip}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div style={{ padding: isMobile ? "8px 10px 12px" : "10px 14px 14px", background:C.inputBg, borderTop:`1px solid ${C.border}` }}>
          {/* Image preview strip */}
          {pestImage && (
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, padding:"8px 12px", background:C.chip, border:`1.5px solid ${C.accent}`, borderRadius:12 }}>
              <img src={pestImage.dataUrl} alt="uploaded" style={{ width:52, height:52, objectFit:"cover", borderRadius:8, flexShrink:0 }} />
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.accentDark }}>📷 Image ready for analysis</div>
                <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pestImage.name}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>Add a question or send directly for pest/disease ID</div>
              </div>
              <button onClick={() => setPestImage(null)} style={{ background:"transparent", border:"none", color:C.muted, fontSize:18, cursor:"pointer", flexShrink:0 }}>✕</button>
            </div>
          )}
          <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:C.bg, borderRadius:14, border:`1.5px solid ${C.inputBorder}`, padding:"8px 8px 8px 14px" }}>
            {/* Hidden file input */}
            <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display:"none" }} />
            {/* Image upload button */}
            <button onClick={() => imageInputRef.current?.click()} title="Upload image for pest/disease identification"
              style={{ width:36, height:36, borderRadius:9, background:pestImage ? C.accentDark : C.chip, border:`1px solid ${pestImage ? C.accentDark : C.chipBorder}`, color:pestImage?"#fff":C.muted, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, alignSelf:"flex-end" }}>
              📷
            </button>
            <textarea ref={textareaRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); pestImage ? sendImageMessage() : sendMessage(); } }}
              rows={1}
              placeholder={pestImage ? "Describe what you see or press ⬆ to analyze..." : activeModeObj ? `Ask ${activeModeObj.label}...` : "Ask about crops, diseases, pests... 🌱"}
              style={{ flex:1, background:"transparent", border:"none", outline:"none", resize:"none", fontSize:14, color:C.text, lineHeight:1.6, maxHeight:120, padding:0, fontFamily:"inherit" }} />
            <button onClick={() => pestImage ? sendImageMessage() : sendMessage()} disabled={loading || (!input.trim() && !pestImage)}
              style={{ width:40, height:40, borderRadius:10, background:loading||((!input.trim()&&!pestImage)) ? C.muted : C.accentDark, border:"none", color:"#fff", cursor:loading||((!input.trim()&&!pestImage))?"not-allowed":"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              {loading ? "⏳" : "⬆️"}
            </button>
          </div>
          <div style={{ textAlign:"center", marginTop:5, fontSize:10, color:C.muted }}>
            AgriMind • Groq • English, اردو, سنڌي • 📷 Upload image for pest/disease ID
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes dot { 0%,80%,100%{transform:scale(0.5);opacity:0.3} 40%{transform:scale(1);opacity:1} }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.chipBorder}; border-radius: 10px; }
        ::-webkit-scrollbar-track { background: transparent; }
        textarea::placeholder { color: ${C.muted}; opacity: 0.65; }
        input::placeholder { color: ${C.muted}; opacity: 0.65; }
        button { -webkit-tap-highlight-color: transparent; }
      `}</style>
    </div>
  );
}

function Dots({ color = "#40916c" }) {
  return (
    <div style={{ display:"flex", gap:4, alignItems:"center" }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:color, animation:`dot 1.2s ${i*0.22}s infinite ease-in-out` }} />
      ))}
    </div>
  );
}
