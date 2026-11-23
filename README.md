<div align="center">

<img src="build/icon-256.png" width="110" alt="VIX-AI HUB logo" />

# VIX-AI HUB

**One desktop hub for every AI chat site that has no desktop app.**

All your AI chats in a single window — each site in its own tab, logins remembered,
quietly sitting in your tray.

[![Windows](https://img.shields.io/badge/platform-Windows%2011-0078D4?logo=windows11)](https://github.com/YousefAlBadawi/VIX-AI-HUB/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

</div>

---

## Why?

Most of the best AI assistants — **z.ai, DeepSeek, Kimi, Qwen, Grok, Le Chat,
NotebookLM, Perplexity, HuggingChat, Poe** — only live in the browser. That means
browser-tab chaos, lost tabs, and no dedicated window.

**VIX-AI HUB** wraps each site in its own desktop tab inside one standalone app:

- 🗂 **Every AI site in one window** — sidebar + tabs, like a browser made for AI
- 🔐 **Logins are remembered** — sign in once per site, the hub keeps the session
- 🖼 **Upload images / videos / files and chat normally** — it's the real site, full fidelity
- ➕ **Add & remove sites yourself** — any website, no code needed
- 🌙 **Dark / Light / System theme** — configurable in Settings
- 🖥 **Tray-friendly** — close button hides to tray (configurable), `Ctrl+Alt+H` toggles the window from anywhere
- ⌨️ **Keyboard-first** — `Ctrl+1…9` tabs, `Ctrl+T` / `Ctrl+W`, `Ctrl+F` search, `Ctrl+±/0` zoom
- 🔔 **Update checker** — the app tells you when a new version is on GitHub Releases
- 🌐 **Arabic-friendly** — full RTL text rendering inside every site

## Install (Windows 11)

1. Download **`VIX-AI-HUB-Setup-1.0.0.exe`** from [Releases](https://github.com/YousefAlBadawi/VIX-AI-HUB/releases/latest)
2. Run it. Windows SmartScreen may warn because the file is not code-signed:
   click **More info → Run anyway**.
3. The desktop shortcut and Start-menu entry appear automatically.

A **portable** single-file `VIX-AI-HUB-Portable-1.0.0.exe` is also available —
no installation, just run it.

## Default sites

| Site | URL |
| --- | --- |
| Z.ai | chat.z.ai |
| DeepSeek | chat.deepseek.com |
| Kimi | kimi.com |
| Qwen | chat.qwen.ai |
| Grok | grok.com |
| Le Chat (Mistral) | chat.mistral.ai |
| NotebookLM | notebooklm.google.com |
| Perplexity | perplexity.ai |
| HuggingChat | huggingface.co/chat |
| Poe | poe.com |

Add or remove any site from the app (**Add site** / right ✕ in the sidebar).
Your list is saved locally and survives restarts.

## Where is my data?

Everything (site list, settings, site cookies/logins) is stored **locally on your
PC** in `%APPDATA%/vix-ai-hub`. No telemetry, no accounts, no cloud. Removing a
site from the hub does not touch your account on that site.

## Build from source

```bash
git clone https://github.com/YousefAlBadawi/VIX-AI-HUB.git
cd VIX-AI-HUB
npm install
npm start          # dev run
npm run dist       # build Windows installers into dist/
```

Requires Node.js 18+ and (for building installers) Windows.

## Tech

Electron + webview tabs, a shared `persist:vixai` session for remembered logins,
context-isolation with a minimal `preload` bridge, and a tiny JSON store for
sites & settings. MIT licensed — see [LICENSE](LICENSE).

---

<div dir="rtl">

## ليه البرنامج ده؟ (بالعربي)

أغلب مواقع الذكاء الاصطناعي — **z.ai و DeepSeek و Kimi و Qwen و Grok و Le Chat
و NotebookLM و Perplexity و HuggingChat و Poe** — مالهاش تطبيق ديسكتوب، فبتضيع
بين تبويبات المتصفح.

**VIX-AI HUB** بيحط كل موقع في تبويب جوّه نافذة واحدة مستقلة:

- كل مواقع الـ AI في نافذة واحدة (قائمة جانبية + تبويبات)
- تسجيل الدخول بيتحفظ — بتدخل مرة واحدة لكل موقع
- تقدر ترفع صور وفيديوهات وملفات وتتکلم طبيعي — هو الموقع نفسه بالكامل
- تضيف وتشيل أي موقع بنفسك من جوّه البرنامج
- مظهر داكن / فاتح / تلقائي من الإعدادات
- زرار القفل بيخبّي البرنامج جنب الساعة (Tray) و`Ctrl+Alt+H` يظهره من أي مكان
- اختصارات كيبورد كاملة زي المتصفح
- البرنامج بيبلّغك لو في نسخة جديدة على GitHub

### التسطيب (ويندوز 11)

1. نزّل **`VIX-AI-HUB-Setup-1.0.0.exe`** من صفحة [Releases](https://github.com/YousefAlBadawi/VIX-AI-HUB/releases/latest)
2. شغّله. ممكن ويندوز يطلّع تحذير لأن الملف مش موقّع بشهادة: اضغط **More info ← Run anyway**
3. أيقونة الديسكتوب وقائمة Start هيظهروا لوحدهم

في نسخة **Portable** كمان — ملف واحد يشتغل من غير تسطيب.

### بياناتي فين؟

كل حاجة (قائمة المواقع، الإعدادات، الكوكيز وتسجيلات الدخول) محفوظة **على جهازك
بس** في `%APPDATA%/vix-ai-hub`. مفيش تتبع ولا حسابات ولا سيرفرات تانية.

</div>
