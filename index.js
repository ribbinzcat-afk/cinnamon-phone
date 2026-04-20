// st-virtual-phone/index.js
import { extension_settings, getContext } from "../../../extensions.js";
import { eventSource, event_types, saveChatDebounced, reloadCurrentChat } from '../../../../script.js';

const EXTENSION_NAME = "cinnamon-phone";
const DEFAULT_SETTINGS = {
    phoneColor: "#000000", iconColor: "#ffffff", wallpaper: "", showFloatingBtn: true, msgTheme: "light-blue",
    userProfile: { avatar: "", igName: "User_IG", twName: "User", twUsername: "@user" },
    twTheme: "dark",
    timeline_ig: [], timeline_tw: [], chat_history: [], library: [],
    unread: { msg: 0, ig: 0, tw: 0 }
};

let settings = {};
let pendingPrompts = [];

const phoneHTML = `
<div id="vp-floating-btn" title="Virtual Phone"><i class="fa-solid fa-mobile-screen"></i><div class="vp-badge-main" id="vp-main-badge">0</div></div>
<div id="vp-container">
    <div id="vp-screen">
        <div class="vp-header"><div class="vp-notch"></div></div>

        <!-- Home -->
        <div id="vp-app-home" class="vp-app-view active">
            <div class="vp-avatar-container"><img id="vp-char-avatar" src=""></div>
            <div class="vp-app-grid">
                <div class="vp-app-icon" data-app="message">
                    <div class="vp-app-icon-box msg"><i class="fa-solid fa-comment"></i></div>
                    <div class="vp-app-badge" id="badge-msg">0</div><span>Message</span>
                </div>
                <div class="vp-app-icon" data-app="insta">
                    <div class="vp-app-icon-box ig"><i class="fa-brands fa-instagram"></i></div>
                    <div class="vp-app-badge" id="badge-ig">0</div><span>Insta</span>
                </div>
                <div class="vp-app-icon" data-app="twitter">
                    <div class="vp-app-icon-box tw"><i class="fa-brands fa-twitter"></i></div>
                    <div class="vp-app-badge" id="badge-tw">0</div><span>Twitter</span>
                </div>
                <div class="vp-app-icon" data-app="settings">
                    <div class="vp-app-icon-box set"><i class="fa-solid fa-gear"></i></div><span>Settings</span>
                </div>
            </div>
        </div>

        <!-- Message -->
        <div id="vp-app-message" class="vp-app-view">
            <div class="vp-top-nav"><i class="fa-solid fa-chevron-left vp-back-btn"></i><span style="font-weight:600;">Messages</span></div>
            <div class="vp-chat-area" id="vp-chat-history"></div>
            <div class="vp-chat-input-area">
                <i class="fa-solid fa-plus vp-action-btn" id="vp-btn-plus"></i>
                <i class="fa-solid fa-folder-open vp-action-btn" id="vp-btn-lib" title="Library" style="font-size:16px;"></i>
                <input type="text" id="vp-msg-input" placeholder="Type a message...">
                <i class="fa-solid fa-paper-plane vp-action-btn" id="vp-btn-send-msg"></i>
            </div>
        </div>

        <!-- Timeline -->
        <div id="vp-app-timeline" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i><span id="vp-tl-title" style="font-weight:600;">Timeline</span>
                <div class="vp-nav-actions"><i class="fa-solid fa-plus vp-nav-btn" id="vp-tl-add"></i></div>
            </div>
            <div class="vp-timeline-list" id="vp-tl-list"></div>
        </div>

        <!-- Form / Settings / Library -->
        <div id="vp-app-form" class="vp-app-view">
            <div class="vp-top-nav"><i class="fa-solid fa-chevron-left vp-back-btn"></i><span id="vp-form-title" style="font-weight:600;">Form</span></div>
            <div class="vp-input-group" id="vp-form-body"></div>
        </div>
    </div>
    <div id="vp-export-btn-outer">ส่งออก Prompt เข้าช่องแชทหลัก</div>
</div>
`;

function loadSettings() {
    if (!extension_settings[EXTENSION_NAME]) extension_settings[EXTENSION_NAME] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    settings = extension_settings[EXTENSION_NAME];
    if(!settings.library) settings.library = [];
    if(!settings.chat_history) settings.chat_history = [];
    if(!settings.unread) settings.unread = {msg:0, ig:0, tw:0};
    if(!settings.userProfile) settings.userProfile = DEFAULT_SETTINGS.userProfile;
}

function saveExtensionSettings() { extension_settings[EXTENSION_NAME] = settings; saveChatDebounced(); updateBadges(); }

function updateBadges() {
    const total = settings.unread.msg + settings.unread.ig + settings.unread.tw;
    if(total > 0) {
        $('#vp-main-badge').text(total).css('display', 'flex');
        $('#vp-floating-btn').addClass('vp-notify');
    } else {
        $('#vp-main-badge').hide();
        $('#vp-floating-btn').removeClass('vp-notify');
    }
    ['msg', 'ig', 'tw'].forEach(app => {
        if(settings.unread[app] > 0) $(`#badge-${app}`).text(settings.unread[app]).css('display', 'flex');
        else $(`#badge-${app}`).hide();
    });
}

function applySettings() {
    $('#vp-container').css('background-color', settings.phoneColor);
    $('#vp-floating-btn').css('color', settings.iconColor).toggle(settings.showFloatingBtn);
    $('#vp-app-message').removeClass('theme-light-blue theme-black theme-dark-grey theme-dark-white').addClass(`theme-${settings.msgTheme}`);

    const context = getContext();
    let bgImage = settings.wallpaper || (context?.characters?.[context.characterId]?.avatar ? `/characters/${context.characters[context.characterId].avatar}` : "https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&w=800");

    $('#vp-char-avatar').attr('src', bgImage);
    $('.vp-app-view').css('background', `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.8)), url('${bgImage}') center/cover`);
    updateBadges();
}

// --- Chat Renderer ---
function renderChat() {
    $('#vp-chat-history').empty();
    settings.chat_history.forEach(msg => {
        let html = '';
        const side = msg.isMe ? 'me' : 'ai';
        if(msg.type === 'text') html = `<div class="vp-chat-bubble ${side}">${msg.content}</div>`;
        else if(msg.type === 'img') html = `<div class="vp-chat-bubble ${side}"><img src="${msg.content}"></div>`;
        else if(msg.type === 'slip') html = `<div class="vp-chat-bubble ${side}" style="background:transparent; padding:0;"><div class="vp-slip-card"><div class="bank-logo"><i class="fa-solid fa-building-columns"></i></div><div style="font-size:12px;">Transfer Successful</div><div class="amount">${msg.content}</div><div class="details">Via Mobile Banking</div></div></div>`;
        else if(msg.type === 'loc') html = `<div class="vp-chat-bubble ${side}" style="background:transparent; padding:0;"><div class="vp-loc-card"><div class="map-bg"><i class="fa-solid fa-location-dot"></i></div><div class="loc-info">${msg.content}</div></div></div>`;
        else if(msg.type === 'voice') html = `<div class="vp-chat-bubble ${side}" style="background:transparent; padding:0;"><div class="vp-voice-card" onclick="$(this).find('.vp-voice-text').slideToggle()"><div class="player"><i class="fa-solid fa-play"></i><div class="wave"></div></div><div class="vp-voice-text">${msg.content}</div></div></div>`;
        $('#vp-chat-history').append(html);
    });
    const chatArea = document.getElementById('vp-chat-history');
    if(chatArea) chatArea.scrollTop = chatArea.scrollHeight;
}

function addChatMessage(isMe, type, content) {
    settings.chat_history.push({isMe, type, content});
    if(!isMe) settings.unread.msg++;
    saveExtensionSettings();
    renderChat();
}

// --- Timeline Renderer ---
function renderTimeline(type) {
    openApp('timeline');
    $('#vp-tl-title').text(type === 'ig' ? 'Instagram' : 'Twitter');
    $('#vp-tl-add').data('type', type);
    settings.unread[type] = 0; saveExtensionSettings();

    const list = type === 'ig' ? settings.timeline_ig : settings.timeline_tw;
    const $list = $('#vp-tl-list').empty();
    $('#vp-app-timeline').removeClass('tw-theme-light tw-theme-dark');
    if(type === 'tw') $('#vp-app-timeline').addClass(`tw-theme-${settings.twTheme}`);

    list.forEach((item, index) => {
        let html = `<div class="vp-tl-item"><div class="vp-tl-header"><img src="${item.avatar || 'https://i.imgur.com/6VBx3io.png'}"><div><div class="vp-tl-name">${item.name}</div>${item.username ? `<div class="vp-tl-username">${item.username}</div>` : ''}</div></div>`;
        if(type === 'ig') {
            html += `<img src="${item.img}" class="vp-tl-img"><div class="vp-tl-text"><b>${item.name}</b> ${item.caption}</div><div class="vp-tl-text" style="color:#aaa;">❤️ ${item.likes || 0} Likes</div>`;
        } else {
            html += `<div class="vp-tl-text">${item.text}</div>`;
        }

        // Comments
        if(item.comments && item.comments.length > 0) {
            html += `<div style="margin-top:10px; padding-top:10px; border-top:1px dashed var(--vp-border); font-size:12px;">`;
            item.comments.forEach(c => { html += `<div><b>${c.author}:</b> ${c.text}</div>`; });
            html += `</div>`;
        }

        const btnClass = item.sent ? 'sent' : 'add-prompt';
        const btnText = item.sent ? '✓ Sent' : '+ Add to Prompt';
        html += `<div class="vp-tl-actions"><button class="vp-tl-btn ${btnClass}" data-type="${type}" data-idx="${index}">${btnText}</button></div></div>`;
        $list.prepend(html);
    });
}

function openApp(appId) {
    $('.vp-app-view').removeClass('active');
    $(`#vp-app-${appId}`).addClass('active');
    if(appId === 'message') { settings.unread.msg = 0; saveExtensionSettings(); renderChat(); }
}

function renderForm(title, inputsHTML, onSave) {
    openApp('form');
    $('#vp-form-title').text(title);
    $('#vp-form-body').html(inputsHTML + `<button class="vp-btn" id="vp-form-submit">Save / Send</button>`);
    $('#vp-form-submit').off('click').on('click', onSave);
}

// --- AI Message Interceptor ---
function onAiMessage(data) {
    let msg = data.mes;
    let modified = false;

    // Regex Checkers
    const rxMsg = /\[VP_MSG:\s*(.*?)\]/g;
    const rxSlip = /\[VP_SLIP:\s*(.*?)\]/g;
    const rxVoice = /\[VP_VOICE:\s*(.*?)\]/g;
    const rxImg = /\[VP_IMG:\s*(.*?)\s*\|\s*(.*?)\]/g;
    const rxLoc = /\[VP_LOC:\s*(.*?)\]/g;
    const rxIg = /\[VP_IG_POST:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/g;
    const rxTw = /\[VP_TW_POST:\s*(.*?)\]/g;

    const context = getContext();
    const aiAvatar = context?.characters?.[context.characterId]?.avatar ? `/characters/${context.characters[context.characterId].avatar}` : '';
    const aiName = context?.characters?.[context.characterId]?.name || 'AI';

    msg = msg.replace(rxMsg, (m, text) => { addChatMessage(false, 'text', text); modified = true; return ''; });
    msg = msg.replace(rxSlip, (m, amt) => { addChatMessage(false, 'slip', amt); modified = true; return ''; });
    msg = msg.replace(rxVoice, (m, text) => { addChatMessage(false, 'voice', text); modified = true; return ''; });
    msg = msg.replace(rxLoc, (m, loc) => { addChatMessage(false, 'loc', loc); modified = true; return ''; });
    msg = msg.replace(rxImg, (m, url) => { addChatMessage(false, 'img', url); modified = true; return ''; });

    msg = msg.replace(rxIg, (m, url, desc, cap) => {
        settings.timeline_ig.push({ author:'ai', name: aiName, avatar: aiAvatar, img: url, caption: cap, likes: Math.floor(Math.random()*500)+50, sent: false });
        settings.unread.ig++; modified = true; return '';
    });
    msg = msg.replace(rxTw, (m, text) => {
        settings.timeline_tw.push({ author:'ai', name: aiName, username: `@${aiName.replace(/\s/g,'').toLowerCase()}`, avatar: aiAvatar, text: text, sent: false });
        settings.unread.tw++; modified = true; return '';
    });

    if(modified) {
        data.mes = msg.trim(); // ลบข้อความที่ดักจับออกไปจากแชทหลัก
        saveExtensionSettings();
        setTimeout(() => { saveChatDebounced(); reloadCurrentChat(); }, 100);
    }
}

function setupEvents() {
    $('#vp-floating-btn').draggable({ containment: "window" }).on('click', function(e) {
        if(e.target.closest('.ui-draggable-dragging')) return;
        $('#vp-container').fadeToggle(); applySettings();
    });
    if (window.innerWidth > 768) $('#vp-container').draggable({ handle: ".vp-header", containment: "window" });

    $(document).on('click', '.vp-app-icon', function() {
        const app = $(this).data('app');
        if (app === 'settings') {
            renderForm('Settings', `
                <label class="vp-label">User Avatar URL</label><input type="text" class="vp-input" id="set-ava" value="${settings.userProfile.avatar}">
                <label class="vp-label">IG Account Name</label><input type="text" class="vp-input" id="set-ig" value="${settings.userProfile.igName}">
                <label class="vp-label">Twitter Name</label><input type="text" class="vp-input" id="set-twn" value="${settings.userProfile.twName}">
                <label class="vp-label">Twitter Username</label><input type="text" class="vp-input" id="set-twu" value="${settings.userProfile.twUsername}">
                <label class="vp-label">Twitter Theme</label><select class="vp-input" id="set-twt"><option value="dark" ${settings.twTheme==='dark'?'selected':''}>Dark</option><option value="light" ${settings.twTheme==='light'?'selected':''}>Light</option></select>
                <hr style="border-color:var(--vp-border); margin:10px 0;">
                <label class="vp-label">Wallpaper URL</label><input type="text" class="vp-input" id="set-wall" value="${settings.wallpaper}">
                <label class="vp-label">Message Theme</label><select class="vp-input" id="set-msg"><option value="light-blue">Light Blue</option><option value="black">Black</option><option value="dark-grey">Dark Grey</option><option value="dark-white">Dark White</option></select>
            `, () => {
                settings.userProfile = { avatar: $('#set-ava').val(), igName: $('#set-ig').val(), twName: $('#set-twn').val(), twUsername: $('#set-twu').val() };
                settings.twTheme = $('#set-twt').val(); settings.wallpaper = $('#set-wall').val(); settings.msgTheme = $('#set-msg').val();
                saveExtensionSettings(); applySettings(); openApp('home'); toastr.success("Saved!");
            });
        } else if (app === 'insta') renderTimeline('ig');
        else if (app === 'twitter') renderTimeline('tw');
        else openApp(app);
    });

    $(document).on('click', '.vp-back-btn', function() { openApp('home'); });

    // --- Library System ---
    $(document).on('click', '#vp-btn-lib', function() {
        let html = `<div class="vp-library-grid">`;
        settings.library.forEach((img, i) => { html += `<div class="vp-lib-item" data-url="${img.url}" data-desc="${img.desc}"><img src="${img.url}"><div class="vp-lib-del" data-idx="${i}"><i class="fa-solid fa-xmark"></i></div></div>`; });
        html += `</div><button class="vp-btn vp-btn-secondary" id="vp-lib-add" style="margin-top:15px; width:100%;">+ Add New Image</button>`;
        renderForm('Library', html, () => openApp('message'));
    });
    $(document).on('click', '#vp-lib-add', function() {
        renderForm('Add to Library', `<label class="vp-label">Image URL</label><input type="text" class="vp-input" id="lib-url"><label class="vp-label">Description (For AI)</label><input type="text" class="vp-input" id="lib-desc">`, () => {
            settings.library.push({url: $('#lib-url').val(), desc: $('#lib-desc').val()}); saveExtensionSettings(); $('#vp-btn-lib').click();
        });
    });
    $(document).on('click', '.vp-lib-del', function(e) { e.stopPropagation(); settings.library.splice($(this).data('idx'), 1); saveExtensionSettings(); $('#vp-btn-lib').click(); });
    $(document).on('click', '.vp-lib-item', function() {
        const url = $(this).data('url'); const desc = $(this).data('desc');
        pendingPrompts.push(`📱 **[Image sent by Lou]**\n[Content: ${desc}]\nLink: ${url}`);
        addChatMessage(true, 'img', url); openApp('message');
    });

    // --- Message App ---
    $(document).on('click', '#vp-btn-send-msg', function() {
        const text = $('#vp-msg-input').val().trim();
        if (text) { pendingPrompts.push(`📱 **[Chat Message from Lou]**: "${text}"`); addChatMessage(true, 'text', text); $('#vp-msg-input').val(''); }
    });

    // --- Export ---
    $(document).on('click', '#vp-export-btn-outer', function() {
        if (pendingPrompts.length === 0) return toastr.warning("No pending prompts.");
        const textarea = document.getElementById('send_textarea');
        if (textarea) {
            textarea.value += (textarea.value.length > 0 ? '\n\n' : '') + pendingPrompts.join('\n\n');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
            pendingPrompts = []; toastr.success("Exported to main chat!");
        }
    });

    // --- Timeline Add ---
    $(document).on('click', '#vp-tl-add', function() {
        const type = $(this).data('type');
        if(type === 'ig') {
            renderForm('New IG Post', `<label class="vp-label">Image URL</label><input type="text" class="vp-input" id="ig-img"><label class="vp-label">Image Detail (For AI)</label><input type="text" class="vp-input" id="ig-desc"><label class="vp-label">Caption (Visible)</label><textarea class="vp-input" id="ig-cap"></textarea>`, () => {
                const post = { author:'user', name: settings.userProfile.igName, avatar: settings.userProfile.avatar, img: $('#ig-img').val(), desc: $('#ig-desc').val(), caption: $('#ig-cap').val(), likes: 0, sent: false };
                settings.timeline_ig.push(post); saveExtensionSettings(); renderTimeline('ig');
            });
        } else {
            renderForm('New Tweet', `<label class="vp-label">Tweet</label><textarea class="vp-input" id="tw-text"></textarea>`, () => {
                const tweet = { author:'user', name: settings.userProfile.twName, username: settings.userProfile.twUsername, avatar: settings.userProfile.avatar, text: $('#tw-text').val(), sent: false };
                settings.timeline_tw.push(tweet); saveExtensionSettings(); renderTimeline('tw');
            });
        }
    });

    $(document).on('click', '.vp-tl-btn.add-prompt', function() {
        const type = $(this).data('type'); const idx = $(this).data('idx');
        const item = type === 'ig' ? settings.timeline_ig[idx] : settings.timeline_tw[idx];
        if(type === 'ig') pendingPrompts.push(`📱 **[Instagram Post by ${item.name}]**\nImage Content: ${item.desc || item.caption}\nCaption: "${item.caption}"`);
        else pendingPrompts.push(`📱 **[Twitter by ${item.name} ${item.username}]**\n"${item.text}"`);

        item.sent = true; saveExtensionSettings(); renderTimeline(type); toastr.success("Added to Prompts!");
    });
}

function init() {
    $('body').append(phoneHTML);
    loadSettings(); applySettings(); setupEvents();
    eventSource.on(event_types.MESSAGE_RECEIVED, onAiMessage);

    const menuHtml = `<div class="list-group-item"><div class="flex-container justify-space-between align-items-center"><span>Toggle Virtual Phone Icon</span><label class="checkbox_label"><input type="checkbox" id="vp-toggle-ext" ${settings.showFloatingBtn ? 'checked' : ''}></label></div></div>`;
    $('#extensions_settings').append(menuHtml);
    $(document).on('change', '#vp-toggle-ext', function() { settings.showFloatingBtn = $(this).is(':checked'); saveExtensionSettings(); applySettings(); });
}

jQuery(function () { init(); });
