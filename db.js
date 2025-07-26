const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize('student_bot', 'root', '', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

module.exports = { sequelize, DataTypes };