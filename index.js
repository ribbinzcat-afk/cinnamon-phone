// st-virtual-phone/index.js
import { extension_settings, getContext } from "../../../extensions.js";
import { saveChatDebounced } from '../../../../script.js';

const EXTENSION_NAME = "st-virtual-phone";
const DEFAULT_SETTINGS = {
    phoneColor: "#000000",
    iconColor: "#ffffff",
    wallpaper: "",
    showFloatingBtn: true
};

let settings = {};
let pendingPrompts = []; // เก็บข้อความที่รอส่งเข้าช่องแชท

// HTML Structure
const phoneHTML = `
<div id="vp-floating-btn" title="Virtual Phone"><i class="fa-solid fa-mobile-screen"></i><div class="vp-badge"></div></div>

<div id="vp-container">
    <div id="vp-screen">
        <div class="vp-header"><div class="vp-notch"></div></div>

        <!-- Home Screen -->
        <div id="vp-app-home" class="vp-app-view active">
            <div class="vp-avatar-container">
                <img id="vp-char-avatar" src="" alt="Avatar">
            </div>
            <div class="vp-app-grid">
                <div class="vp-app-icon" data-app="message">
                    <div class="vp-app-icon-box msg"><i class="fa-solid fa-comment"></i></div>
                    <span>Message</span>
                </div>
                <div class="vp-app-icon" data-app="insta">
                    <div class="vp-app-icon-box ig"><i class="fa-brands fa-instagram"></i></div>
                    <span>Insta</span>
                </div>
                <div class="vp-app-icon" data-app="twitter">
                    <div class="vp-app-icon-box tw"><i class="fa-brands fa-twitter"></i></div>
                    <span>Twitter</span>
                </div>
                <div class="vp-app-icon" data-app="settings">
                    <div class="vp-app-icon-box set"><i class="fa-solid fa-gear"></i></div>
                    <span>Settings</span>
                </div>
            </div>
        </div>

        <!-- Message App -->
        <div id="vp-app-message" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i>
                <span style="font-weight:600;">Messages</span>
            </div>
            <div class="vp-chat-area" id="vp-chat-history">
                <!-- Chat bubbles go here -->
            </div>
            <div class="vp-plus-menu" id="vp-plus-menu">
                <div class="vp-plus-item" data-action="slip"><i class="fa-solid fa-money-bill-transfer"></i> ส่งสลิปโอนเงิน</div>
                <div class="vp-plus-item" data-action="location"><i class="fa-solid fa-location-dot"></i> ส่งโลเคชั่น</div>
                <div class="vp-plus-item" data-action="voice"><i class="fa-solid fa-microphone"></i> ข้อความเสียง</div>
                <div class="vp-plus-item" data-action="image"><i class="fa-solid fa-image"></i> ส่งรูปภาพ/สติกเกอร์</div>
            </div>
            <div class="vp-chat-input-area">
                <i class="fa-solid fa-plus vp-action-btn" id="vp-btn-plus"></i>
                <input type="text" id="vp-msg-input" placeholder="Type a message...">
                <i class="fa-solid fa-paper-plane vp-action-btn" id="vp-btn-send-msg" style="color:var(--vp-primary)"></i>
            </div>
            <div class="vp-send-to-st" id="vp-export-prompt">ส่งออก Prompt เข้าช่องแชทหลัก</div>
        </div>

        <!-- Settings App -->
        <div id="vp-app-settings" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i>
                <span style="font-weight:600;">Settings</span>
            </div>
            <div class="vp-input-group">
                <label>Wallpaper URL (Home Screen)</label>
                <input type="text" class="vp-input" id="vp-set-wallpaper" placeholder="https://...">
                <label>Phone Frame Color</label>
                <input type="color" class="vp-input" id="vp-set-frame-color">
                <label>Floating Icon Color</label>
                <input type="color" class="vp-input" id="vp-set-icon-color">
                <button class="vp-btn" id="vp-save-settings">Save Settings</button>
            </div>
        </div>

        <!-- Generic Form View (For Slip, Location, Voice, Insta, Twitter) -->
        <div id="vp-app-form" class="vp-app-view">
            <div class="vp-top-nav">
                <i class="fa-solid fa-chevron-left vp-back-btn"></i>
                <span id="vp-form-title" style="font-weight:600;">Form</span>
            </div>
            <div class="vp-input-group" id="vp-form-body">
                <!-- Dynamic inputs -->
            </div>
        </div>

    </div>
</div>
`;

function loadSettings() {
    if (Object.keys(extension_settings).length === 0) {
        extension_settings[EXTENSION_NAME] = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    }
    settings = extension_settings[EXTENSION_NAME] || DEFAULT_SETTINGS;
}

function applySettings() {
    $('#vp-container').css('background-color', settings.phoneColor);
    $('#vp-floating-btn').css('color', settings.iconColor);

    if (!settings.showFloatingBtn) {
        $('#vp-floating-btn').hide();
    } else {
        $('#vp-floating-btn').show();
    }

    const context = getContext();
    let bgImage = settings.wallpaper;

    // ถ้าไม่มีวอลเปเปอร์ ให้ใช้รูปตัวละครปัจจุบัน + Overlay ดำจางๆ
    if (!bgImage && context && context.characters && context.characterId !== undefined) {
        const char = context.characters[context.characterId];
        if (char && char.avatar) {
            bgImage = `/characters/${char.avatar}`;
            $('#vp-char-avatar').attr('src', bgImage);
        }
    }

    if (bgImage) {
        $('#vp-app-home').css('background', `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${bgImage}') center/cover`);
        $('#vp-app-message').css('background', `linear-gradient(rgba(0,0,0,0.8), rgba(0,0,0,0.8)), url('${bgImage}') center/cover`);
    }
}

// ฟังก์ชันสำหรับส่งข้อความที่เตรียมไว้เข้าช่อง Input ของ SillyTavern
function exportToSillyTavern() {
    if (pendingPrompts.length === 0) return;

    const combinedPrompt = pendingPrompts.join('\n\n');
    const textarea = document.getElementById('send_textarea');

    if (textarea) {
        // แทรกข้อความต่อท้ายของเดิม
        textarea.value += (textarea.value.length > 0 ? '\n\n' : '') + combinedPrompt;
        // Trigger event เพื่อให้ UI ของ ST อัปเดตขนาดกล่องข้อความ
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        // ล้างข้อมูลที่รอส่ง
        pendingPrompts = [];
        $('#vp-chat-history').empty();

        // แจ้งเตือนผู้ใช้
        toastr.success("ส่งออก Prompt เรียบร้อยแล้ว (ยังไม่ได้กดส่งให้ AI)");
    }
}

function openApp(appId) {
    $('.vp-app-view').removeClass('active');
    $(`#vp-app-${appId}`).addClass('active');
}

function renderForm(title, inputsHTML, onSave) {
    openApp('form');
    $('#vp-form-title').text(title);
    $('#vp-form-body').html(inputsHTML + `<button class="vp-btn" id="vp-form-submit">Add to Prompt</button>`);

    $('#vp-form-submit').off('click').on('click', function() {
        onSave();
        openApp('message'); // กลับไปหน้าแชท
    });
}

function setupEvents() {
    // Floating Button Toggle
    $('#vp-floating-btn').on('click', function() {
        $('#vp-container').fadeToggle();
        $(this).removeClass('vp-notify');
        applySettings(); // อัปเดตอวาตาร์ทุกครั้งที่เปิด
    });

    // Draggable Phone (ปิดการลากบนมือถือ)
    if (window.innerWidth > 768) {
        $('#vp-container').draggable({
            handle: ".vp-header",
            containment: "window"
        });
    }

    // App Navigation
    $(document).on('click', '.vp-app-icon', function() {
        const app = $(this).data('app');
        openApp(app);

        // ถ้าเปิด Settings ให้โหลดค่าปัจจุบันลงฟอร์ม
        if (app === 'settings') {
            $('#vp-set-wallpaper').val(settings.wallpaper || '');
            $('#vp-set-frame-color').val(settings.phoneColor);
            $('#vp-set-icon-color').val(settings.iconColor);
        }

        // ถ้าเปิด Insta/Twitter (โครงสร้างจำลอง)
        if (app === 'insta') {
            renderForm('Instagram Post', `
                <input type="text" class="vp-input" id="ig-img" placeholder="Image URL">
                <textarea class="vp-input" id="ig-caption" placeholder="Caption..."></textarea>
                <input type="number" class="vp-input" id="ig-likes" placeholder="Likes count" value="100">
            `, () => {
                const prompt = `📱 **[Instagram Post by {{user}}]**\nImage: ${$('#ig-img').val()}\nCaption: "${$('#ig-caption').val()}"\n❤️ ${$('#ig-likes').val()} Likes`;
                pendingPrompts.push(prompt);
                toastr.success("Added IG Post to pending prompts");
            });
        }
        if (app === 'twitter') {
            renderForm('New Tweet', `
                <textarea class="vp-input" id="tw-text" placeholder="What's happening?"></textarea>
                <select class="vp-input" id="tw-privacy"><option value="Public">Public</option><option value="Private">Private</option></select>
            `, () => {
                const prompt = `📱 **[Twitter (${$('#tw-privacy').val()}) by {{user}}]**\n"${$('#tw-text').val()}"`;
                pendingPrompts.push(prompt);
                toastr.success("Added Tweet to pending prompts");
            });
        }
    });

    $(document).on('click', '.vp-back-btn', function() {
        openApp('home');
    });

    // Settings Save
    $(document).on('click', '#vp-save-settings', function() {
        settings.wallpaper = $('#vp-set-wallpaper').val();
        settings.phoneColor = $('#vp-set-frame-color').val();
        settings.iconColor = $('#vp-set-icon-color').val();

        extension_settings[EXTENSION_NAME] = settings;
        saveChatDebounced();
        applySettings();
        toastr.success("Phone settings saved!");
    });

    // Message App - Plus Menu
    $(document).on('click', '#vp-btn-plus', function() {
        $('#vp-plus-menu').toggleClass('active');
    });

    // Message App - Send Text
    $(document).on('click', '#vp-btn-send-msg', function() {
        const text = $('#vp-msg-input').val().trim();
        if (text) {
            // แสดงใน UI โทรศัพท์
            $('#vp-chat-history').append(`<div class="vp-chat-bubble me">${text}</div>`);
            // เก็บเข้าคิว Prompt
            pendingPrompts.push(`📱 **[Chat Message from {{user}}]**: "${text}"`);
            $('#vp-msg-input').val('');

            // เลื่อนจอลงล่างสุด
            const chatArea = document.getElementById('vp-chat-history');
            chatArea.scrollTop = chatArea.scrollHeight;
        }
    });

    // Message App - Plus Actions
    $(document).on('click', '.vp-plus-item', function() {
        const action = $(this).data('action');
        $('#vp-plus-menu').removeClass('active');

        if (action === 'slip') {
            renderForm('Bank Transfer', `
                <input type="text" class="vp-input" id="slip-to" placeholder="Transfer To (Name)">
                <input type="number" class="vp-input" id="slip-amount" placeholder="Amount">
            `, () => {
                const prompt = `📱 **[Bank Transfer Slip]**\nFrom: {{user}}\nTo: ${$('#slip-to').val()}\nAmount: $${$('#slip-amount').val()}`;
                pendingPrompts.push(prompt);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me" style="background:#28a745;">💸 Transfer: $${$('#slip-amount').val()}</div>`);
            });
        } else if (action === 'location') {
            renderForm('Share Location', `
                <input type="text" class="vp-input" id="loc-name" placeholder="Location Name / Address">
            `, () => {
                const prompt = `📱 **[Location Shared by {{user}}]**\n📍 Location: ${$('#loc-name').val()}`;
                pendingPrompts.push(prompt);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me" style="background:#17a2b8;">📍 Location: ${$('#loc-name').val()}</div>`);
            });
        } else if (action === 'voice') {
            renderForm('Voice Message', `
                <textarea class="vp-input" id="voice-text" placeholder="Type what the voice message says..."></textarea>
            `, () => {
                const prompt = `📱 **[Voice Message from {{user}}]**\n▶️ *(Audio plays: "${$('#voice-text').val()}")*`;
                pendingPrompts.push(prompt);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me" style="background:#6f42c1;">▶️ Voice Message</div>`);
            });
        } else if (action === 'image') {
            renderForm('Send Image/Sticker', `
                <input type="text" class="vp-input" id="img-url" placeholder="Image/Sticker URL">
                <input type="text" class="vp-input" id="img-desc" placeholder="Description for AI">
            `, () => {
                const prompt = `📱 **[Image/Sticker sent by {{user}}]**\n[Image Content: ${$('#img-desc').val()}]\nLink: ${$('#img-url').val()}`;
                pendingPrompts.push(prompt);
                $('#vp-chat-history').append(`<div class="vp-chat-bubble me"><img src="${$('#img-url').val()}" style="max-width:100%; border-radius:10px;" alt="Image"></div>`);
            });
        }
    });

    // Export Prompt Button
    $(document).on('click', '#vp-export-prompt', function() {
        exportToSillyTavern();
    });
}

function init() {
    $('body').append(phoneHTML);
    loadSettings();
    applySettings();
    setupEvents();

    // เพิ่มเมนูเปิด/ปิดปุ่มลอยใน Extension Menu ของ SillyTavern
    const menuHtml = `
        <div class="list-group-item">
            <div class="flex-container justify-space-between align-items-center">
                <span>Toggle Virtual Phone Button</span>
                <label class="checkbox_label">
                    <input type="checkbox" id="vp-toggle-ext-menu" ${settings.showFloatingBtn ? 'checked' : ''}>
                </label>
            </div>
        </div>
    `;
    $('#extensions_settings').append(menuHtml);

    $(document).on('change', '#vp-toggle-ext-menu', function() {
        settings.showFloatingBtn = $(this).is(':checked');
        extension_settings[EXTENSION_NAME] = settings;
        saveChatDebounced();
        applySettings();
    });
}

jQuery(function () {
    init();
});
