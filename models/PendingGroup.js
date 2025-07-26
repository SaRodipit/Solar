module.exports = (sequelize, DataTypes) => {
  return sequelize.define('PendingGroup', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    requested_by: {
      type: DataTypes.BIGINT
    }
  }, {
    tableName: 'PendingGroups',
    timestamps: true
  });
};