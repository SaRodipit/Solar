module.exports = (sequelize, DataTypes) => {
  return sequelize.define('Group', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'Groups',
    timestamps: true
  });
};