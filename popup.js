const $ = id => document.getElementById(id);
let currentHost = "";
let tabId = null;

const SUPPORTED_HOSTS = [
  "deepseek.com", "tongyi.com", "qianwen.com", "doubao.com",
  "kimi.com", "moonshot.cn", "yuanbao.tencent.com", "chatglm.cn",
  "z.ai", "qwen.ai", "yiyan.baidu.com", "chat.baidu.com",
  "xinghuo.xfyun.cn"
];

function isSupportedHost(host) {
  return SUPPORTED_HOSTS.some(domain => host === domain || host.endsWith("." + domain));
}

async function activeTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function load() {
  const tab = await activeTab();
  tabId = tab?.id ?? null;
  try { currentHost = new URL(tab.url).hostname; } catch { currentHost = ""; }
  $("host").textContent = currentHost || "当前页面不受支持";
  const data = await chrome.storage.local.get({ enabled: true, disabledHosts: [] });
  const supported = isSupportedHost(currentHost);
  $("enabled").disabled = !supported;
  $("rescan").disabled = !supported;
  $("enabled").checked = supported && data.enabled !== false && !data.disabledHosts.includes(currentHost);
  $("status").textContent = supported ? "已识别支持的网站。可启用并手动扫描当前对话。" : "此版本尚未适配当前网站。";
}

$("enabled").addEventListener("change", async event => {
  const data = await chrome.storage.local.get({ disabledHosts: [] });
  const disabled = new Set(data.disabledHosts);
  if (event.target.checked) disabled.delete(currentHost);
  else disabled.add(currentHost);
  await chrome.storage.local.set({ disabledHosts: [...disabled] });
  if (tabId) chrome.tabs.sendMessage(tabId, { type: "AIMR_SETTINGS_CHANGED" }).catch(() => {});
  $("status").textContent = event.target.checked ? "已在此网站启用。" : "已在此网站停用。";
});

$("rescan").addEventListener("click", async () => {
  $("rescan").disabled = true;
  $("status").textContent = "正在扫描…";
  try {
    const result = await chrome.tabs.sendMessage(tabId, { type: "AIMR_RESCAN" });
    $("status").textContent = result?.rendered
      ? "本次补渲染 " + result.rendered + " 个公式（涉及 " + result.blocks + " 个内容块）。"
      : (result?.failed ? "发现公式，但有 " + result.failed + " 个公式语法不兼容，已保留原文。" : "没有发现可自动修复的未渲染公式。");
  } catch {
    $("status").textContent = "页面脚本尚未就绪，请刷新网页后重试。";
  } finally {
    $("rescan").disabled = false;
  }
});

load();
