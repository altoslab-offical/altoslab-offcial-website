#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";

const ADMIN_COOKIE = "altos_admin";
const ROOT = String(arg("base-url", process.env.ALTOS_BLOG_BASE_URL || "https://altoslab-ai.cc")).replace(/\/+$/, "");
const SLUG = "openai-limits-gpt-5-6-rollout-after-government-request-says-restrictions-s";
const LANGUAGES = ["zh-Hant", "en", "ja", "ko", "id", "vi", "th", "ms", "fil"];

function arg(name, fallback = "") {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^['"]|['"]$/g, "");
  }
}

loadEnvFile(`${process.env.HOME}/.altoslab-aws.env`);
loadEnvFile(`${process.env.HOME}/.altoslab-blog-worker.env`);

function sign(secret, timestamp, nonce, body) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

function signedHeaders(secret, body) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomBytes(16).toString("hex");
  return {
    "Content-Type": "application/json",
    "X-Altos-Timestamp": timestamp,
    "X-Altos-Nonce": nonce,
    "X-Altos-Signature": sign(secret, timestamp, nonce, body)
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "ALTOS-LAB-gpt56-market-repair/1.0",
      ...(options.headers || {})
    },
    signal: AbortSignal.timeout(45_000)
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`${options.method || "GET"} ${url} failed: ${response.status} ${text}`);
  return { response, payload: text ? JSON.parse(text) : {} };
}

async function adminCookie() {
  const token = process.env.ALTOS_ADMIN_SESSION_TOKEN || process.env.ADMIN_SESSION_TOKEN || "";
  if (token) return `${ADMIN_COOKIE}=${encodeURIComponent(token)}`;
  const password = process.env.ALTOS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";
  if (!password) return "";
  const { response } = await fetchJson(`${ROOT}/api/admin/auth/login`, {
    method: "POST",
    body: JSON.stringify({ password })
  });
  return (response.headers.get("set-cookie") || "").match(/(?:^|,\s*)(altos_admin=[^;]+)/)?.[1] || "";
}

async function currentPost(language) {
  const { payload } = await fetchJson(`${ROOT}/api/blog/${encodeURIComponent(SLUG)}?language=${encodeURIComponent(language)}&ts=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" }
  });
  return payload.post || payload.payload?.post || payload;
}

const sourceLinks = [
  {
    title: "OpenAI limits GPT-5.6 rollout after government request, says restrictions shouldn't be the norm",
    url: "https://techcrunch.com/2026/06/26/openai-limits-gpt-5-6-rollout-after-government-request-says-restrictions-shouldnt-be-the-norm/",
    publisher: "TechCrunch",
    date: "2026-06-26",
    summary:
      "TechCrunch reports that OpenAI limited the GPT-5.6 rollout after a U.S. government request, while saying government access restrictions should not become the long-term default. The GPT-5.6 lineup includes Sol, Terra and Luna."
  }
];

const sharedImages = {
  coverSource: "source",
  coverCredit: "TechCrunch",
  coverCreditUrl: sourceLinks[0].url
};

const patches = {
  "zh-Hant": {
    title: "OpenAI 限制 GPT-5.6 發布：政府審查正在改變模型上線節奏",
    seoTitle: "OpenAI 限制 GPT-5.6 發布，政府審查與模型上線節奏成焦點",
    excerpt: "TechCrunch 報導，OpenAI 在美國政府要求後限制 GPT-5.6 的初期發布，並表示這類政府存取流程不應成為長期預設。",
    seoDescription: "TechCrunch 報導 OpenAI 限制 GPT-5.6 發布，涉及美國政府要求、Sol、Terra、Luna 三款模型，以及模型發布與安全審查節奏。",
    geoSummary: "GPT-5.6 事件把模型發布速度、政府存取流程、資安需求與開發者可用性放到同一張桌上。重點不是單一模型延後，而是 AI 公司如何避免限制流程變成常態。",
    keyTakeaways: [
      "OpenAI 這次不是全面開放 GPT-5.6，而是先以受限方式給特定合作方使用。",
      "TechCrunch 提到 GPT-5.6 系列包含 Sol、Terra、Luna，分別對應旗艦、日常平衡與較快低成本選項。",
      "企業採用新模型時，要同時看能力、可用性、審查限制和 fallback 路線。"
    ],
    body: `這則消息真正改變的，是企業對前沿模型發布節奏的預期。過去新模型發布常被當成產品升級消息，但這次 GPT-5.6 被放進政府要求、安全審查與全球可用性的同一個框架裡，代表「什麼時候能用」開始和「模型有多強」一樣重要。

這篇報導的重點不是單純的模型延期，而是模型發布節奏開始被安全審查、政府要求與全球可用性一起牽動。當最強模型不能立即開放，企業就不能只問「哪個模型最好」，還要問：它能不能在需要的地區使用、API 是否穩定、限制是否會影響產品排程。

TechCrunch 提到 GPT-5.6 系列包含三個方向：Sol 是旗艦模型，Terra 是較平衡的日常使用模型，Luna 則主打更快與更低成本。這讓限制發布的影響不只落在單一模型，也會影響不同成本、速度與能力組合。

對企業團隊來說，這是一個採購與產品風險訊號。若產品功能高度依賴最新模型，一旦發布節奏變慢、地區受限或只開放給部分合作方，roadmap 就會被外部政策牽動。比較穩的做法，是在導入前準備 fallback model、功能降級方案與版本切換測試。

另一個要注意的點是「受限預覽」和「正式可用」之間的落差。特定合作方能先測，不代表一般開發者、企業客戶或跨國團隊馬上能把它放進產品。採購和工程團隊需要把這種時間差寫進評估表：哪些功能可以等 GPT-5.6，哪些功能必須先用現有模型上線，哪些功能一旦模型延後就要暫停。

這也會影響成本規劃。Sol、Terra、Luna 分別對應不同能力與成本位置，若其中一段可用性受限，團隊可能被迫用更貴或較慢的替代方案。模型發布限制因此不只是政策新聞，也會變成產品成本和交付風險。

更實際的做法，是把模型發布狀態列進產品看板：已宣布、限定預覽、API 可用、正式支援、區域可用、成本穩定。只有走到後面幾格，才適合承接會影響客戶承諾的功能。

下一步要看兩件事：OpenAI 是否把 GPT-5.6 的限制發布視為單次個案，以及其他 AI 公司是否面臨類似審查壓力。若這種節奏反覆出現，模型發布就會從產品消息變成治理問題。`
  },
  en: {
    title: "OpenAI slows GPT-5.6 rollout as government review reshapes model launches",
    seoTitle: "OpenAI limits GPT-5.6 rollout after government request",
    excerpt: "TechCrunch reports that OpenAI limited the initial GPT-5.6 rollout after a U.S. government request, while arguing that government access should not become the default.",
    seoDescription: "TechCrunch reports that OpenAI limited GPT-5.6 rollout after a U.S. government request. The report names Sol, Terra and Luna and raises model-release governance questions.",
    geoSummary: "The GPT-5.6 rollout turns model launches into a governance question: government access, cyber defense needs, developer availability, enterprise planning and fallback strategy now sit in the same decision.",
    keyTakeaways: [
      "OpenAI is not treating GPT-5.6 as a normal broad rollout at launch.",
      "TechCrunch says the GPT-5.6 family includes Sol, Terra and Luna across flagship, balanced and lower-cost use cases.",
      "Enterprise teams should plan for model fallback, regional access limits and delayed API availability."
    ],
    body: `For AI product teams, the real signal is predictability. A frontier model launch is no longer just a capability upgrade; it can also become a question of government review, partner access and whether the model will be available when a roadmap expects it.

The important point is not just that a new model is arriving more slowly. It is that model launches are becoming entangled with security review, government access and global availability. If the strongest model is not immediately available, enterprise buyers cannot evaluate only benchmark quality. They also have to ask where the model can be used, whether the API path is stable and whether launch restrictions will affect product timelines.

TechCrunch names three GPT-5.6 variants: Sol as the flagship model, Terra as a more balanced everyday model and Luna as a faster lower-cost option. That means a restricted rollout can affect more than one model tier; it can shape cost, speed and capability choices across the product stack.

For teams building on AI, this is a release-risk signal. If a product depends on the newest model, any delay, limited partner access or regional restriction can affect the roadmap. A safer operating plan includes fallback models, feature degradation paths and version-switch tests before a feature depends on one frontier model.

The next thing to watch is whether OpenAI treats this as a one-off case, or whether government review becomes a recurring layer in frontier model releases. If it repeats, model launches will no longer be only product news. They will become governance and platform-dependency events.`
  },
  ja: {
    title: "OpenAI、GPT-5.6 の展開を制限：政府審査がモデル公開の速度を変え始めた",
    seoTitle: "OpenAI が GPT-5.6 展開を制限、政府要請とモデル公開ガバナンスが焦点に",
    excerpt: "TechCrunch は、OpenAI が米政府の要請を受けて GPT-5.6 の初期展開を制限し、政府アクセスを長期の標準にすべきではないと述べたと報じた。",
    seoDescription: "TechCrunch は OpenAI が GPT-5.6 の展開を制限したと報道。Sol、Terra、Luna、政府要請、セキュリティ審査、企業の代替モデル戦略が焦点。",
    geoSummary: "GPT-5.6 の展開制限は、モデル性能だけでなく、政府アクセス、サイバー防御、開発者の利用可能性、企業の導入計画を同時に見る必要があることを示している。",
    keyTakeaways: [
      "OpenAI は GPT-5.6 を通常の全面公開ではなく、制限付きの初期展開にした。",
      "TechCrunch は GPT-5.6 系列として Sol、Terra、Luna を挙げている。",
      "企業は最新モデルだけに依存せず、代替モデルと機能縮退の計画を持つ必要がある。"
    ],
    body: `AI 製品チームにとって、このニュースの核心は「最新モデルがいつ使えるか」という予測可能性だ。フロンティアモデルの公開は、能力の更新だけではなく、政府審査、限定パートナー、地域ごとの利用可能性まで含む運用問題になり始めている。

重要なのは、新モデルの公開が少し遅いという話だけではない。フロンティアモデルの公開が、安全審査、政府要請、地域別の利用可能性と結びつき始めている点だ。企業は「どのモデルが一番強いか」だけでなく、そのモデルが必要な市場で使えるのか、API が安定しているのか、制限が製品計画を変えないかを確認する必要がある。

TechCrunch は GPT-5.6 系列として、旗艦モデルの Sol、日常利用向けにバランスを取った Terra、より速く低コストな Luna を挙げている。つまり制限付き展開は一つのモデルだけでなく、速度、費用、性能の選択肢全体に影響する。

AI を製品や業務に組み込む企業にとって、これはリリースリスクの警告だ。最新モデルを前提に機能を作るほど、政府審査、限定公開、地域制限にロードマップが左右されやすくなる。代替モデル、機能縮退、バージョン切り替えテストを先に用意しておくべきだ。

もう一つ重要なのは、限定プレビューと正式利用の差だ。一部のパートナーが先に試せることと、一般の開発者や企業が本番環境で使えることは同じではない。導入計画では、GPT-5.6 を待てる機能、既存モデルで先に進める機能、モデル遅延時に止める機能を分けておく必要がある。

コスト面でも影響はある。Sol、Terra、Luna は能力、速度、費用の異なる選択肢として読めるため、どれかの利用が遅れると、チームはより高価または遅い代替手段を選ばざるを得ない可能性がある。モデル公開の制限は、政策ニュースであると同時に、製品運用の制約でもある。

次に見るべきなのは、この GPT-5.6 の対応が一回限りなのか、それとも今後のモデル公開で繰り返される新しい層になるのかだ。繰り返されるなら、モデル発表は単なる製品ニュースではなく、ガバナンスとプラットフォーム依存の問題になる。`
  },
  ko: {
    title: "OpenAI, GPT-5.6 출시 제한: 정부 검토가 모델 공개 속도를 바꾸고 있다",
    seoTitle: "OpenAI GPT-5.6 출시 제한, 정부 요청과 모델 릴리스 거버넌스",
    excerpt: "TechCrunch는 OpenAI가 미국 정부 요청 이후 GPT-5.6 초기 배포를 제한했으며, 이런 정부 접근 절차가 장기 기본값이 되어서는 안 된다고 보도했다.",
    seoDescription: "TechCrunch는 OpenAI가 GPT-5.6 출시를 제한했다고 보도했다. Sol, Terra, Luna, 정부 요청, 보안 검토, 기업의 대체 모델 전략이 핵심이다.",
    geoSummary: "GPT-5.6 제한 배포는 모델 출시가 성능 경쟁만이 아니라 정부 접근, 사이버 방어, 개발자 접근성, 기업 제품 일정의 문제가 되었음을 보여준다.",
    keyTakeaways: [
      "OpenAI는 GPT-5.6을 일반적인 전면 공개 방식으로 시작하지 않았다.",
      "TechCrunch는 GPT-5.6 제품군에 Sol, Terra, Luna가 포함된다고 전했다.",
      "기업은 최신 모델 의존 기능에 fallback model과 기능 축소 경로를 준비해야 한다."
    ],
    body: `AI 제품팀이 봐야 할 핵심은 예측 가능성이다. 프런티어 모델 출시는 더 이상 성능 업그레이드 소식만이 아니다. 정부 검토, 제한된 파트너 접근, 지역별 사용 가능성이 함께 제품 일정에 영향을 주는 운영 문제가 되고 있다.

핵심은 새 모델이 조금 늦게 나온다는 이야기가 아니다. 프런티어 모델 출시가 보안 검토, 정부 요청, 글로벌 접근성과 함께 움직이기 시작했다는 점이다. 기업은 이제 벤치마크 점수만 볼 수 없다. 필요한 지역에서 쓸 수 있는지, API 경로가 안정적인지, 제한 배포가 제품 일정에 영향을 주는지 확인해야 한다.

TechCrunch는 GPT-5.6 제품군으로 플래그십 모델 Sol, 일상 사용에 더 균형을 둔 Terra, 더 빠르고 비용이 낮은 Luna를 언급했다. 제한 배포는 단일 모델 문제가 아니라 비용, 속도, 성능 선택지 전체에 영향을 줄 수 있다.

AI를 제품이나 업무에 넣는 팀에게 이는 릴리스 리스크 신호다. 최신 모델 하나에 기능을 강하게 묶을수록, 정부 검토나 일부 파트너 제한, 지역별 접근 제한이 로드맵을 흔들 수 있다. 더 안전한 방식은 대체 모델, 기능 축소 경로, 버전 전환 테스트를 먼저 준비하는 것이다.

또 하나 봐야 할 것은 제한된 preview와 실제 production 사용 사이의 차이다. 일부 파트너가 먼저 테스트할 수 있다는 말은 일반 개발자나 기업 고객이 바로 제품에 넣을 수 있다는 뜻이 아니다. 팀은 GPT-5.6을 기다릴 기능, 기존 모델로 먼저 출시할 기능, 모델 지연 시 멈출 기능을 구분해야 한다.

비용 계획에도 영향이 있다. Sol, Terra, Luna는 각각 다른 능력, 속도, 비용 위치를 가진 선택지로 볼 수 있다. 특정 선택지가 늦게 열리면 팀은 더 비싸거나 느린 대안을 써야 할 수 있다. 모델 출시 제한은 정책 뉴스인 동시에 제품 운영 제약이다.

다음으로 봐야 할 것은 OpenAI가 이 조치를 일회성 사례로 끝낼지, 아니면 앞으로 프런티어 모델 출시의 반복되는 절차가 될지다. 반복된다면 모델 출시는 제품 뉴스가 아니라 거버넌스와 플랫폼 의존성 문제가 된다.`
  },
  id: {
    title: "OpenAI membatasi GPT-5.6: rilis model kini ikut terseret proses pemerintah",
    seoTitle: "OpenAI batasi rollout GPT-5.6 setelah permintaan pemerintah AS",
    excerpt: "TechCrunch melaporkan OpenAI membatasi peluncuran awal GPT-5.6 setelah permintaan pemerintah AS, sambil menegaskan akses pemerintah tidak seharusnya menjadi standar jangka panjang.",
    seoDescription: "TechCrunch melaporkan OpenAI membatasi GPT-5.6. Laporan ini menyebut Sol, Terra, Luna, permintaan pemerintah AS, keamanan model, dan strategi fallback untuk perusahaan.",
    geoSummary: "Kasus GPT-5.6 menunjukkan rilis model AI kini dipengaruhi akses pemerintah, keamanan siber, ketersediaan untuk pengembang, dan rencana fallback enterprise.",
    keyTakeaways: [
      "OpenAI tidak membuka GPT-5.6 dengan pola peluncuran luas seperti biasa.",
      "TechCrunch menyebut tiga varian GPT-5.6: Sol, Terra, dan Luna.",
      "Tim produk perlu menyiapkan fallback model bila akses model terbaru tertunda atau dibatasi."
    ],
    body: `Bagi tim produk AI, sinyal utamanya adalah kepastian waktu akses. Peluncuran model frontier tidak lagi sekadar kabar peningkatan kemampuan; ia juga bisa dipengaruhi peninjauan pemerintah, akses mitra tertentu, dan kesiapan model untuk dipakai dalam roadmap nyata.

Poin utamanya bukan hanya model baru datang lebih lambat. Peluncuran model frontier mulai terkait dengan peninjauan keamanan, permintaan pemerintah, dan ketersediaan global. Perusahaan tidak cukup hanya menilai model mana yang paling kuat; mereka juga harus melihat apakah model itu bisa dipakai di pasar yang dibutuhkan, apakah API stabil, dan apakah pembatasan akses akan mengganggu roadmap produk.

TechCrunch menyebut keluarga GPT-5.6 terdiri dari Sol sebagai model flagship, Terra sebagai model yang lebih seimbang untuk penggunaan harian, dan Luna sebagai opsi yang lebih cepat serta lebih murah. Artinya pembatasan rilis dapat memengaruhi pilihan biaya, kecepatan, dan kapabilitas sekaligus.

Bagi tim yang membangun produk AI, ini adalah sinyal risiko rilis. Bila fitur terlalu bergantung pada satu model terbaru, keterlambatan, akses terbatas untuk mitra tertentu, atau pembatasan wilayah dapat langsung memengaruhi jadwal. Rencana yang lebih aman mencakup fallback model, mode degradasi fitur, dan pengujian pergantian versi.

Hal berikutnya yang perlu dipantau adalah apakah langkah terhadap GPT-5.6 ini hanya kasus khusus atau menjadi lapisan tetap dalam peluncuran model frontier. Jika berulang, peluncuran model bukan lagi sekadar berita produk, tetapi isu tata kelola dan ketergantungan platform.`
  },
  vi: {
    title: "OpenAI hạn chế GPT-5.6: việc ra mắt mô hình bắt đầu chịu áp lực kiểm duyệt",
    seoTitle: "OpenAI hạn chế triển khai GPT-5.6 sau yêu cầu từ chính phủ Mỹ",
    excerpt: "TechCrunch đưa tin OpenAI hạn chế giai đoạn triển khai đầu của GPT-5.6 sau yêu cầu từ chính phủ Mỹ, đồng thời nói rằng quyền truy cập của chính phủ không nên thành mặc định lâu dài.",
    seoDescription: "TechCrunch đưa tin OpenAI hạn chế GPT-5.6. Bài viết nhắc đến Sol, Terra, Luna, yêu cầu của chính phủ Mỹ, an toàn mô hình và kế hoạch fallback cho doanh nghiệp.",
    geoSummary: "Câu chuyện GPT-5.6 cho thấy việc ra mắt mô hình AI không chỉ là năng lực kỹ thuật mà còn liên quan đến quyền truy cập của chính phủ, an ninh mạng, nhà phát triển và kế hoạch sản phẩm.",
    keyTakeaways: [
      "OpenAI không triển khai GPT-5.6 theo kiểu mở rộng ngay từ đầu.",
      "TechCrunch cho biết dòng GPT-5.6 gồm Sol, Terra và Luna.",
      "Doanh nghiệp nên chuẩn bị mô hình dự phòng khi quyền truy cập mô hình mới bị trì hoãn."
    ],
    body: `Với các nhóm sản phẩm AI, tín hiệu quan trọng nhất là khả năng dự đoán thời điểm truy cập. Việc ra mắt mô hình frontier không còn chỉ là tin nâng cấp năng lực; nó có thể bị ảnh hưởng bởi kiểm tra của chính phủ, quyền truy cập của một số đối tác và khả năng đưa mô hình vào roadmap thực tế.

Điểm quan trọng không chỉ là một mô hình mới ra mắt chậm hơn. Việc phát hành mô hình frontier đang bắt đầu gắn với kiểm tra an toàn, yêu cầu của chính phủ và khả năng sử dụng ở từng thị trường. Doanh nghiệp không thể chỉ hỏi mô hình nào mạnh nhất; họ còn phải hỏi mô hình đó có dùng được ở thị trường cần thiết hay không, API có ổn định không và giới hạn truy cập có ảnh hưởng đến roadmap sản phẩm không.

TechCrunch nhắc đến ba biến thể trong dòng GPT-5.6: Sol là mô hình flagship, Terra cân bằng hơn cho nhu cầu hằng ngày, còn Luna nhanh hơn và có chi phí thấp hơn. Vì vậy, hạn chế triển khai có thể ảnh hưởng cùng lúc đến lựa chọn về năng lực, tốc độ và chi phí.

Với các nhóm xây sản phẩm AI, đây là tín hiệu rủi ro về release. Nếu một tính năng phụ thuộc quá nhiều vào mô hình mới nhất, bất kỳ trì hoãn, giới hạn đối tác hoặc giới hạn khu vực nào cũng có thể làm lệch kế hoạch. Cách an toàn hơn là chuẩn bị mô hình dự phòng, chế độ giảm cấp tính năng và kiểm thử chuyển phiên bản.

Điều cần theo dõi tiếp theo là liệu cách xử lý GPT-5.6 chỉ là trường hợp riêng hay sẽ trở thành một lớp quy trình mới trong các lần ra mắt mô hình frontier. Nếu điều này lặp lại, tin ra mắt mô hình sẽ không còn chỉ là tin sản phẩm mà trở thành vấn đề quản trị và phụ thuộc nền tảng.`
  },
  th: {
    title: "OpenAI จำกัด GPT-5.6: การเปิดตัวโมเดลเริ่มถูกกำหนดด้วยการตรวจสอบของรัฐ",
    seoTitle: "OpenAI จำกัดการเปิดตัว GPT-5.6 หลังคำขอจากรัฐบาลสหรัฐฯ",
    excerpt: "TechCrunch รายงานว่า OpenAI จำกัดการเปิดตัวช่วงแรกของ GPT-5.6 หลังคำขอจากรัฐบาลสหรัฐฯ และระบุว่าการเข้าถึงของรัฐไม่ควรกลายเป็นค่าเริ่มต้นระยะยาว",
    seoDescription: "TechCrunch รายงานว่า OpenAI จำกัด GPT-5.6 โดยพูดถึง Sol, Terra, Luna, คำขอจากรัฐบาลสหรัฐฯ, ความปลอดภัยของโมเดล และแผน fallback ขององค์กร",
    geoSummary: "กรณี GPT-5.6 ทำให้การเปิดตัวโมเดล AI กลายเป็นเรื่องของการเข้าถึงของรัฐ ความปลอดภัยไซเบอร์ ความพร้อมสำหรับนักพัฒนา และแผนสำรองขององค์กร",
    keyTakeaways: [
      "OpenAI ไม่ได้เปิด GPT-5.6 แบบกว้างตั้งแต่เริ่มต้นเหมือนการเปิดตัวทั่วไป",
      "TechCrunch ระบุว่า GPT-5.6 มี Sol, Terra และ Luna",
      "ทีมองค์กรควรเตรียม fallback model หากโมเดลใหม่ถูกจำกัดหรือเปิดช้า"
    ],
    body: `สำหรับทีมผลิตภัณฑ์ AI สัญญาณสำคัญคือความแน่นอนของเวลาเข้าถึงโมเดล การเปิดตัว frontier model ไม่ใช่แค่ข่าวว่าโมเดลเก่งขึ้นอีกขั้น แต่เริ่มเกี่ยวข้องกับการตรวจสอบของรัฐ การให้สิทธิ์กับพาร์ตเนอร์บางกลุ่ม และความพร้อมในการนำไปใช้ใน roadmap จริง

ประเด็นสำคัญไม่ใช่แค่ว่าโมเดลใหม่มาช้ากว่าเดิม แต่คือการเปิดตัวโมเดลระดับ frontier เริ่มผูกกับการตรวจสอบความปลอดภัย คำขอจากรัฐ และความพร้อมใช้งานในแต่ละตลาด องค์กรจึงไม่ควรถามแค่ว่าโมเดลไหนเก่งที่สุด แต่ต้องถามด้วยว่าใช้ได้ในประเทศที่ต้องการหรือไม่ API เสถียรหรือไม่ และข้อจำกัดการเปิดตัวจะกระทบ roadmap หรือไม่

TechCrunch ระบุว่าตระกูล GPT-5.6 มีสามตัวเลือก ได้แก่ Sol ซึ่งเป็นโมเดล flagship, Terra ที่สมดุลกว่าสำหรับการใช้งานทั่วไป และ Luna ที่เร็วกว่าและมีต้นทุนต่ำกว่า ดังนั้นการจำกัดการเปิดตัวจึงกระทบทั้งความสามารถ ความเร็ว และต้นทุนพร้อมกัน

สำหรับทีมที่สร้างผลิตภัณฑ์ AI ข่าวนี้เป็นสัญญาณความเสี่ยงด้าน release หากฟีเจอร์ผูกกับโมเดลล่าสุดมากเกินไป ความล่าช้า การเปิดให้เฉพาะพาร์ตเนอร์บางกลุ่ม หรือข้อจำกัดตามภูมิภาคอาจทำให้แผนงานเปลี่ยนทันที วิธีที่ปลอดภัยกว่าคือเตรียมโมเดลสำรอง โหมดลดระดับฟีเจอร์ และการทดสอบเปลี่ยนเวอร์ชันไว้ก่อน

สิ่งที่ต้องดูต่อคือ OpenAI จะมองการจำกัด GPT-5.6 เป็นกรณีเฉพาะ หรือจะกลายเป็นขั้นตอนซ้ำในการเปิดตัวโมเดล frontier ถ้ามันเกิดซ้ำ ข่าวเปิดตัวโมเดลจะไม่ใช่แค่ข่าวผลิตภัณฑ์ แต่เป็นเรื่อง governance และ platform dependency ด้วย`
  },
  ms: {
    title: "OpenAI hadkan GPT-5.6: pelancaran model kini dipengaruhi semakan kerajaan",
    seoTitle: "OpenAI hadkan pelancaran GPT-5.6 selepas permintaan kerajaan AS",
    excerpt: "TechCrunch melaporkan OpenAI mengehadkan pelancaran awal GPT-5.6 selepas permintaan kerajaan AS, sambil menegaskan akses kerajaan tidak patut menjadi lalai jangka panjang.",
    seoDescription: "TechCrunch melaporkan OpenAI mengehadkan GPT-5.6. Laporan itu menyebut Sol, Terra, Luna, permintaan kerajaan AS, keselamatan model dan rancangan fallback perusahaan.",
    geoSummary: "Kes GPT-5.6 menunjukkan pelancaran model AI kini turut dipengaruhi akses kerajaan, keselamatan siber, ketersediaan pembangun dan strategi fallback perusahaan.",
    keyTakeaways: [
      "OpenAI tidak membuka GPT-5.6 secara luas pada permulaan pelancaran.",
      "TechCrunch menyebut tiga varian GPT-5.6: Sol, Terra dan Luna.",
      "Pasukan produk perlu menyediakan model sandaran jika akses model baharu lewat atau terhad."
    ],
    body: `Bagi pasukan produk AI, isyarat utama ialah kepastian masa akses. Pelancaran model frontier bukan lagi sekadar berita peningkatan keupayaan; ia juga boleh dipengaruhi semakan kerajaan, akses rakan tertentu dan sama ada model itu sedia dimasukkan ke dalam roadmap sebenar.

Isunya bukan sekadar model baharu tiba lebih lambat. Pelancaran model frontier mula berkait dengan semakan keselamatan, permintaan kerajaan dan ketersediaan global. Perusahaan tidak cukup hanya menilai model mana paling kuat; mereka juga perlu melihat sama ada model itu boleh digunakan di pasaran sasaran, sama ada API stabil dan sama ada sekatan akses akan mengubah roadmap produk.

TechCrunch menyebut keluarga GPT-5.6 terdiri daripada Sol sebagai model flagship, Terra sebagai model yang lebih seimbang untuk kegunaan harian, dan Luna sebagai pilihan yang lebih pantas serta lebih rendah kos. Ini bermakna pelancaran terhad boleh mempengaruhi pilihan kos, kelajuan dan keupayaan serentak.

Bagi pasukan yang membina produk AI, ini ialah isyarat risiko release. Jika ciri produk terlalu bergantung pada model terbaru, kelewatan, akses terhad kepada rakan tertentu atau sekatan wilayah boleh terus menjejaskan jadual. Pelan yang lebih selamat termasuk model sandaran, mod degradasi ciri dan ujian pertukaran versi.

Perkara seterusnya untuk dipantau ialah sama ada langkah terhadap GPT-5.6 ini hanya kes khusus atau menjadi lapisan tetap dalam pelancaran model frontier. Jika berulang, pelancaran model bukan lagi sekadar berita produk, tetapi isu tadbir urus dan kebergantungan platform.`
  },
  fil: {
    title: "Nilimitahan ng OpenAI ang GPT-5.6: pati release ng modelo, may pressure na mula sa gobyerno",
    seoTitle: "Nilimitahan ng OpenAI ang GPT-5.6 matapos ang hiling ng gobyerno ng US",
    excerpt: "Iniulat ng TechCrunch na nilimitahan ng OpenAI ang unang rollout ng GPT-5.6 matapos ang hiling ng gobyerno ng US, at sinabing hindi dapat maging pangmatagalang default ang government access.",
    seoDescription: "Iniulat ng TechCrunch na nilimitahan ng OpenAI ang GPT-5.6. Kasama sa report ang Sol, Terra, Luna, hiling ng US government, model safety, at fallback planning ng enterprise.",
    geoSummary: "Ipinapakita ng kaso ng GPT-5.6 na ang AI model release ay hindi lang tungkol sa capability; kasama na rin ang government access, cyber defense, developer availability, at fallback plan ng kumpanya.",
    keyTakeaways: [
      "Hindi inilabas ng OpenAI ang GPT-5.6 sa normal na malawakang rollout mula sa simula.",
      "Ayon sa TechCrunch, kasama sa GPT-5.6 lineup ang Sol, Terra at Luna.",
      "Kailangang maghanda ang product teams ng fallback model kung maantala o malimitahan ang access."
    ],
    body: `Para sa AI product teams, ang pinakaimportanteng signal ay predictability ng access. Ang launch ng frontier model ay hindi na lang balitang mas malakas ang bagong modelo; puwede na rin itong maapektuhan ng government review, limited partner access, at kung kailan talaga ito magagamit sa product roadmap.

Hindi lang ito kuwento tungkol sa mas mabagal na release ng bagong modelo. Ipinapakita nito na ang frontier model launches ay nagsisimulang maapektuhan ng safety review, government requests at global availability. Hindi sapat na itanong ng kumpanya kung alin ang pinakamalakas na modelo; kailangan ding itanong kung available ito sa target market, stable ang API at hindi ba sisirain ng access limits ang product roadmap.

Ayon sa TechCrunch, kasama sa GPT-5.6 family ang Sol bilang flagship model, Terra bilang mas balanced na modelo para sa araw-araw na gamit, at Luna bilang mas mabilis at mas mababang-cost na opsyon. Ibig sabihin, ang limitadong rollout ay puwedeng makaapekto sa capability, speed at cost choices nang sabay-sabay.

Para sa teams na bumubuo ng AI products, release-risk signal ito. Kung masyadong nakaasa ang feature sa pinakabagong modelo, anumang delay, partner-only access o regional restriction ay puwedeng gumalaw sa roadmap. Mas ligtas ang planong may fallback model, feature degradation mode at version-switch testing bago isandal ang product sa isang frontier model.

Ang susunod na dapat bantayan ay kung one-off case lang ang GPT-5.6 restriction, o kung magiging paulit-ulit na layer ito sa frontier model releases. Kapag naulit, ang model launch ay hindi na lang product news; magiging governance at platform-dependency event na rin ito.`
  }
};

function assertPatch(language, patch) {
  const text = [patch.title, patch.excerpt, patch.geoSummary, patch.body, ...(patch.keyTakeaways || [])].join("\n");
  if (!patch.excerpt.includes("GPT-5.6")) throw new Error(`${language} excerpt missing GPT-5.6`);
  if (!patch.excerpt.includes("TechCrunch")) throw new Error(`${language} excerpt missing TechCrunch`);
  if (/^["“]|^TechCrunch reports that “/i.test(patch.excerpt)) throw new Error(`${language} excerpt still starts with raw quote`);
  if (!/Sol|Terra|Luna/.test(text)) throw new Error(`${language} missing Sol/Terra/Luna`);
  if (patch.keyTakeaways?.some((item) => overlap(item, patch.excerpt) >= 0.72)) {
    throw new Error(`${language} takeaway repeats excerpt`);
  }
}

function comparable(value = "") {
  return String(value).toLowerCase().replace(/[，。,.!?！？；;:\s]/g, "");
}

function overlap(a = "", b = "") {
  const left = comparable(a);
  const right = comparable(b);
  if (!left || !right) return 0;
  const n = 3;
  const grams = (text) => {
    const set = new Set();
    for (let index = 0; index <= text.length - n; index += 1) set.add(text.slice(index, index + n));
    return set;
  };
  const leftSet = grams(left);
  const rightSet = grams(right);
  let hits = 0;
  for (const gram of leftSet) if (rightSet.has(gram)) hits += 1;
  return hits / Math.max(leftSet.size, rightSet.size, 1);
}

async function main() {
  const cmsPatches = [];
  for (const language of LANGUAGES) {
    const current = await currentPost(language);
    const patch = {
      ...sharedImages,
      ...patches[language],
      sourceLinks,
      contentType: "breaking",
      generatedBy: "source-translation:market-source-worker:official-repair-20260627"
    };
    assertPatch(language, patch);
    cmsPatches.push({ id: current.id, patch });
  }

  if (hasFlag("dry-run")) {
    console.log(JSON.stringify({ ok: true, dryRun: true, patches: cmsPatches.map((item, index) => ({ language: LANGUAGES[index], id: item.id, title: item.patch.title })) }, null, 2));
    return;
  }

  const body = JSON.stringify({ patches: cmsPatches });
  const secret = process.env.BLOG_INGEST_HMAC_SECRET || process.env.ALTOS_BLOG_INGEST_HMAC_SECRET || "";
  const cookie = await adminCookie();
  const { payload } = await fetchJson(`${ROOT}/api/admin/blog/bulk-patch`, {
    method: "POST",
    headers: {
      ...(secret ? signedHeaders(secret, body) : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body
  });

  const readback = [];
  for (const language of LANGUAGES) {
    const post = await currentPost(language);
    readback.push({ language, title: post.title, excerpt: post.excerpt, bodyLength: String(post.body || "").length, takeaways: post.keyTakeaways?.length || 0 });
  }
  console.log(JSON.stringify({ ok: true, result: payload, readback }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
