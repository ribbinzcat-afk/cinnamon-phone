// st-virtual-phone/index.js
import { extension_settings, getContext } from "../../../extensions.js";
import { eventSource, event_types, saveChatDebounced } from '../../../../script.js';

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
                <div class="vp-app-icon" data-app="message"><div class="vp-app-icon-box msg"><i class="fa-solid fa-comment"></i></div><div class="vp-app-badge" id="badge-msg">0</div><span>Message</span></div>
                <div class="vp-app-icon" data-app="insta"><div class="vp-app-icon-box ig"><i class="fa-brands fa-instagram"></i></div><div class="vp-app-badge" id="badge-ig">0</div><span>Insta</span></div>
                <div class="vp-app-icon" data-app="twitter"><div class="vp-app-icon-box tw"><i class="fa-brands fa-twitter"></i></div><div class="vp-app-badge" id="badge-tw">0</div><span>Twitter</span></div>
                <div class="vp-app-icon" data-app="settings"><div class="vp-app-icon-box set"><i class="fa-solid fa-gear"></i></div><span>Settings</span></div>
            </div>
        </div>

        <!-- Message -->
        <div id="vp-app-message" class="vp-app-view">
            <div class="vp-top-nav"><i class="fa-solid fa-chevron-left vp-back-btn"></i><span style="font-weight:600;">Messages</span></div>
            <div class="vp-chat-area" id="vp-chat-history"></div>

            <!-- Plus Menu ย้ายมาอยู่ตรงนี้เพื่อไม่ให้โดนซ่อน -->
            <div class="vp-plus-menu" id="vp-plus-menu">
                <div class="vp-plus-item" data-action="slip"><i class="fa-solid fa-money-bill-transfer"></i> ส่งสลิปโอนเงิน</div>
                <div class="vp-plus-item" data-action="location"><i class="fa-solid fa-location-dot"></i> ส่งโลเคชั่น</div>
                <div class="vp-plus-item" data-action="voice"><i class="fa-solid fa-microphone"></i> ข้อความเสียง</div>
                <div class="vp-plus-item" data-action="image"><i class="fa-solid fa-image"></i> ส่งรูปภาพ/สติกเกอร์</div>
            </div>

            <div class="vp-chat-input-area">
                <i class="fa-solid fa-plus vp-action-btn" id="vp-btn-plus"></i>
                <i class="fa-solid fa-folder-open vp-action-btn" id="vp-btn-lib" title="Library" style="font-size:16px;"></i>
                <input type="text" id="vp-msg-input" placeholder="Type a message...">
                <i class="fa-solid fa-paper-plane vp-action-btn" id="vp-btn-send-msg"></i>
            </div>
        </div>

        <!-- Timeline -->
        <div id="vp-app-timeline" class="vp-app-view">
            <div class="vp-top-nav"><i class="fa-solid fa-chevron-left vp-back-btn"></i><span id="vp-tl-title" style="font-weight:600;">Timeline</span><div class="vp-nav-actions"><i class="fa-solid fa-plus vp-nav-btn" id="vp-tl-add"></i></div></div>
            <div class="vp-timeline-list" id="vp-tl-list"></div>
        </div>

        <!-- Form -->
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
    if(total > 0) { $('#vp-main-badge').text(total).css('display', 'flex'); $('#vp-floating-btn').addClass('vp-notify'); }
    else { $('#vp-main-badge').hide(); $('#vp-floating-btn').removeClass('vp-notify'); }
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

    list.forEach((item, index) => {
        let html = `<div class="vp-tl-item"><div class="vp-tl-header"><img src="${item.avatar || 'https://i.imgur.com/6VBx3io.png'}"><div><div class="vp-tl-name">${item.name}</div>${item.username ? `<div class="vp-tl-username">${item.username}</div>` : ''}</div></div>`;
        if(type === 'ig') {
            html += `<img src="${item.img}" class="vp-tl-img"><div class="vp-tl-text"><b>${item.name}</b> ${item.caption}</div><div class="vp-tl-text" style="color:#aaa;">❤️ ${item.likes || 0} Likes</div>`;
        } else {
            html += `<div class="vp-tl-text">${item.text}</div>`;
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

// --- AI Message Interceptor (ไม่ลบข้อความหลักแล้ว) ---
function onAiMessage(data) {
    const msg = data.mes;
    const context = getContext();
    const aiAvatar = context?.characters?.[context.characterId]?.avatar ? `/characters/${context.characters[context.characterId].avatar}` : '';
    const aiName = context?.characters?.[context.characterId]?.name || 'AI';

    let hasNew = false;
    let match;

    const rxMsg = /\[VP_MSG:\s*(.*?)\]/g;
    while ((match = rxMsg.exec(msg)) !== null) { addChatMessage(false, 'text', match[1]); hasNew = true; }

    const rxSlip = /\[VP_SLIP:\s*(.*?)\]/g;
    while ((match = rxSlip.exec(msg)) !== null) { addChatMessage(false, 'slip', match[1]); hasNew = true; }

    const rxVoice = /\[VP_VOICE:\s*(.*?)\]/g;
    while ((match = rxVoice.exec(msg)) !== null) { addChatMessage(false, 'voice', match[1]); hasNew = true; }

    const rxLoc = /\[VP_LOC:\s*(.*?)\]/g;
    while ((match = rxLoc.exec(msg)) !== null) { addChatMessage(false, 'loc', match[1]); hasNew = true; }

    const rxImg = /\[VP_IMG:\s*(.*?)\s*\|\s*(.*?)\]/g;
    while ((match = rxImg.exec(msg)) !== null) { addChatMessage(false, 'img', match[1].trim()); hasNew = true; }

    const rxIg = /\[VP_IG_POST:\s*(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/g;
    while ((match = rxIg.exec(msg)) !== null) {
        settings.timeline_ig.push({ author:'ai', name: aiName, avatar: aiAvatar, img: match[1].trim(), caption: match[3].trim(), likes: Math.floor(Math.random()*500)+50, sent: false });
        settings.unread.ig++; hasNew = true;
    }

    const rxTw = /\[VP_TW_POST:\s*(.*?)\]/g;
    while ((match = rxTw.exec(msg)) !== null) {
        settings.timeline_tw.push({ author:'ai', name: aiName, username: `@${aiName.replace(/\s/g,'').toLowerCase()}`, avatar: aiAvatar, text: match[1].trim(), sent: false });
        settings.unread.tw++; hasNew = true;
    }

    if(hasNew) {
        saveExtensionSettings();
        // ไม่มีการแก้ไข data.mes แล้ว ดังนั้นข้อความในแชทหลักจะยังอยู่ครบ
    }
}

function setupEvents() {
    // Draggable ปุ่มลอย โดยจำกัดไม่ให้หลุดขอบจอ
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
                <hr style="border-color:var(--vp-border); margin:10px 0;">
                <label class="vp-label">Wallpaper URL</label><input type="text" class="vp-input" id="set-wall" value="${settings.wallpaper}">
                <label class="vp-label">Message Theme</label><select class="vp-input" id="set-msg"><option value="light-blue" ${settings.msgTheme==='light-blue'?'selected':''}>Light Blue</option><option value="black" ${settings.msgTheme==='black'?'selected':''}>Black</option><option value="dark-grey" ${settings.msgTheme==='dark-grey'?'selected':''}>Dark Grey</option><option value="dark-white" ${settings.msgTheme==='dark-white'?'selected':''}>Dark White</option></select>
            `, () => {
                settings.userProfile = { avatar: $('#set-ava').val(), igName: $('#set-ig').val(), twName: $('#set-twn').val(), twUsername: $('#set-twu').val() };
                settings.wallpaper = $('#set-wall').val(); settings.msgTheme = $('#set-msg').val();
                saveExtensionSettings(); applySettings(); openApp('home'); toastr.success("Saved!");
            });
        } else if (app === 'insta') renderTimeline('ig');
        else if (app === 'twitter') renderTimeline('tw');
        else openApp(app);
    });

    $(document).on('click', '.vp-back-btn', function() { openApp('home'); });

    // --- Message Plus Menu ---
    $(document).on('click', '#vp-btn-plus', function() {
        $('#vp-plus-menu').toggleClass('active');
    });

    // --- Message Actions ---
    $(document).on('click', '#vp-btn-send-msg', function() {
        const text = $('#vp-msg-input').val().trim();
        if (text) { pendingPrompts.push(`📱 **[Chat Message from Lou]**: "${text}"`); addChatMessage(true, 'text', text); $('#vp-msg-input').val(''); }
    });

    $(document).on('click', '.vp-plus-item', function() {
        const action = $(this).data('action');
        $('#vp-plus-menu').removeClass('active'); // ปิดเมนูหลังจากเลือก

        if (action === 'slip') {
            renderForm('Bank Transfer', `<label class="vp-label">Transfer To (Name)</label><input type="text" class="vp-input" id="slip-to"><label class="vp-label">Amount ($)</label><input type="number" class="vp-input" id="slip-amount">`, () => {
                pendingPrompts.push(`📱 **[Bank Transfer Slip]**\nFrom: Lou\nTo: ${$('#slip-to').val()}\nAmount: $${$('#slip-amount').val()}`);
                addChatMessage(true, 'slip', `$${$('#slip-amount').val()}`); openApp('message');
            });
        } else if (action === 'location') {
            renderForm('Share Location', `<label class="vp-label">Location Name / Address</label><input type="text" class="vp-input" id="loc-name">`, () => {
                pendingPrompts.push(`📱 **[Location Shared by Lou]**\n📍 Location: ${$('#loc-name').val()}`);
                addChatMessage(true, 'loc', $('#loc-name').val()); openApp('message');
            });
        } else if (action === 'voice') {
            renderForm('Voice Message', `<label class="vp-label">Voice Text (What you said)</label><textarea class="vp-input" id="voice-text"></textarea>`, () => {
                pendingPrompts.push(`📱 **[Voice Message from Lou]**\n▶️ *(Audio plays: "${$('#voice-text').val()}")*`);
                addChatMessage(true, 'voice', $('#voice-text').val()); openApp('message');
            });
        } else if (action === 'image') {
            renderForm('Send Image', `<label class="vp-label">Image URL</label><input type="text" class="vp-input" id="msg-img-url"><label class="vp-label">Description</label><input type="text" class="vp-input" id="msg-img-desc">`, () => {
                pendingPrompts.push(`📱 **[Image sent by Lou]**\n[Content: ${$('#msg-img-desc').val()}]\nLink: ${$('#msg-img-url').val()}`);
                addChatMessage(true, 'img', $('#msg-img-url').val()); openApp('message');
            });
        }
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
}

function init() {
    $('body').append(phoneHTML);
    loadSettings(); applySettings(); setupEvents();
    eventSource.on(event_types.MESSAGE_RECEIVED, onAiMessage);
}

jQuery(function () { init(); });
