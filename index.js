const TelegramBot = require('node-telegram-bot-api');
const { sequelize, DataTypes } = require('./db');
const Group = require('./models/Group')(sequelize, DataTypes);
const PendingGroup = require('./models/PendingGroup')(sequelize, DataTypes);

const token = '7600665438:AAHXDVepbk1QylzY9atnkqmkHXAGD5--TMY';
const bot = new TelegramBot(token, { polling: true });

const userState = {}; 
const ADMINS = [688251472]; // Telegram ID администратора(можно менять либо добавить)

async function sendGroupPage(chatId, page = 0) {
  const groupsPerPage = 5;
  const offset = page * groupsPerPage;

  const groups = await Group.findAll({ limit: groupsPerPage, offset });
  const totalGroups = await Group.count();
  const totalPages = Math.ceil(totalGroups / groupsPerPage);

  const buttons = groups.map(g => [
    { text: g.name, callback_data: `select_group_${g.id}` }
  ]);

  const navButtons = [];
  if (page > 0) navButtons.push({ text: '⬅️ Назад', callback_data: `group_page_${page - 1}` });
  if (page < totalPages - 1) navButtons.push({ text: '➡️ Далее', callback_data: `group_page_${page + 1}` });
  if (navButtons.length) buttons.push(navButtons);

  buttons.push([{ text: '➕ Добавить группу', callback_data: 'add_group' }]);

  bot.sendMessage(chatId, `📚 Группы (страница ${page + 1} из ${totalPages}):`, {
    reply_markup: { inline_keyboard: buttons }
  });

  userState[chatId] = { page };
}

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '👋 Добро пожаловать! Нажмите кнопку ниже, чтобы начать:', {
    reply_markup: {
      keyboard: [['Группы']],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text.trim();

  
  if (text.toLowerCase() === 'Группы') {
    return bot.sendMessage(chatId, 'Что вы хотите сделать?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📚 Выбрать группу', callback_data: 'group_choose' }],
          [{ text: '➕ Добавить группу', callback_data: 'add_group' }]
        ]
      }
    });
  }

  // Ввод названия новой группы
  if (userState[chatId] && userState[chatId] === 'awaiting_group_name') {
    const exists = await Group.findOne({ where: { name: text } });
    if (exists) {
      bot.sendMessage(chatId, '❌ Такая группа уже существует.');
    } else {
      await PendingGroup.create({ name: text, requested_by: msg.from.id });
      bot.sendMessage(chatId, `✅ Заявка на группу "${text}" отправлена.`);
    }
    delete userState[chatId];
  }
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === 'group_choose') {
    return sendGroupPage(chatId, 0);
  }

  if (data === 'add_group') {
    bot.sendMessage(chatId, 'Введите название новой группы:');
    userState[chatId] = 'awaiting_group_name';
  }

  if (data.startsWith('group_page_')) {
    const page = parseInt(data.split('_')[2]);
    return sendGroupPage(chatId, page);
  }

  if (data.startsWith('accept_group_')) {
    const id = parseInt(data.split('_')[2]);
    const group = await PendingGroup.findByPk(id);
    if (!group) return bot.sendMessage(chatId, '❌ Заявка не найдена.');

    await Group.create({ name: group.name });
    await PendingGroup.destroy({ where: { id } });
    bot.sendMessage(chatId, `✅ Группа "${group.name}" добавлена!`);
  }

  if (data.startsWith('reject_group_')) {
    const id = parseInt(data.split('_')[2]);
    const group = await PendingGroup.findByPk(id);
    if (!group) return bot.sendMessage(chatId, '❌ Заявка не найдена.');

    await PendingGroup.destroy({ where: { id } });
    bot.sendMessage(chatId, `🚫 Заявка на группу "${group.name}" отклонена.`);
  }
});

// /moderate: админ видит заявки на добавление групп
bot.onText(/\/moderate/, async (msg) => {
  const chatId = msg.chat.id;
  if (!ADMINS.includes(msg.from.id)) {
    return bot.sendMessage(chatId, '🚫 У вас нет доступа.');
  }

  const pending = await PendingGroup.findAll();

  if (pending.length === 0) {
    return bot.sendMessage(chatId, '📭 Заявок на добавление групп нет.');
  }

  for (const group of pending) {
    await bot.sendMessage(chatId, `🔹 Группа: ${group.name}`, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Принять', callback_data: `accept_group_${group.id}` },
            { text: '❌ Отклонить', callback_data: `reject_group_${group.id}` },
          ],
        ],
      },
    });
  }
});