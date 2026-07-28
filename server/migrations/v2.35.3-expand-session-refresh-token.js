/**
 * @typedef MigrationContext
 * @property {import('sequelize').QueryInterface} queryInterface - a Sequelize QueryInterface object.
 * @property {import('../Logger')} logger - a Logger object.
 *
 * @typedef MigrationOptions
 * @property {MigrationContext} context - an object containing the migration context.
 */

const migrationVersion = '2.35.3'
const migrationName = `${migrationVersion}-expand-session-refresh-token`
const loggerPrefix = `[${migrationVersion} migration]`

/**
 * This migration widens sessions.refreshToken and sessions.lastRefreshToken from VARCHAR(255) to TEXT,
 * since JWTs can exceed 255 characters and were failing to insert on Postgres.
 *
 * @param {MigrationOptions} options - an object containing the migration context.
 * @returns {Promise<void>} - A promise that resolves when the migration is complete.
 */
async function up({ context: { queryInterface, logger } }) {
  logger.info(`${loggerPrefix} UPGRADE BEGIN: ${migrationName}`)

  if (await queryInterface.tableExists('sessions')) {
    const DataTypes = queryInterface.sequelize.Sequelize.DataTypes

    await queryInterface.changeColumn('sessions', 'refreshToken', {
      type: DataTypes.TEXT,
      allowNull: false
    })
    logger.info(`${loggerPrefix} changed sessions.refreshToken to TEXT`)

    await queryInterface.changeColumn('sessions', 'lastRefreshToken', {
      type: DataTypes.TEXT,
      allowNull: true
    })
    logger.info(`${loggerPrefix} changed sessions.lastRefreshToken to TEXT`)
  } else {
    logger.info(`${loggerPrefix} sessions table does not exist`)
  }

  logger.info(`${loggerPrefix} UPGRADE END: ${migrationName}`)
}

/**
 * This migration reverts sessions.refreshToken and sessions.lastRefreshToken back to VARCHAR(255).
 *
 * @param {MigrationOptions} options - an object containing the migration context.
 * @returns {Promise<void>} - A promise that resolves when the migration is complete.
 */
async function down({ context: { queryInterface, logger } }) {
  logger.info(`${loggerPrefix} DOWNGRADE BEGIN: ${migrationName}`)

  if (await queryInterface.tableExists('sessions')) {
    const DataTypes = queryInterface.sequelize.Sequelize.DataTypes

    await queryInterface.changeColumn('sessions', 'refreshToken', {
      type: DataTypes.STRING(255),
      allowNull: false
    })
    logger.info(`${loggerPrefix} reverted sessions.refreshToken to VARCHAR(255)`)

    await queryInterface.changeColumn('sessions', 'lastRefreshToken', {
      type: DataTypes.STRING(255),
      allowNull: true
    })
    logger.info(`${loggerPrefix} reverted sessions.lastRefreshToken to VARCHAR(255)`)
  } else {
    logger.info(`${loggerPrefix} sessions table does not exist`)
  }

  logger.info(`${loggerPrefix} DOWNGRADE END: ${migrationName}`)
}

module.exports = { up, down }
