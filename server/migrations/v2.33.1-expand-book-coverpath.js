/**
 * @typedef MigrationContext
 * @property {import('sequelize').QueryInterface} queryInterface
 * @property {import('../Logger')} logger
 *
 * @typedef MigrationOptions
 * @property {MigrationContext} context
 */

const migrationVersion = '2.33.1'
const migrationName = `${migrationVersion}-expand-book-coverpath`
const loggerPrefix = `[${migrationVersion} migration]`

async function up({ context: { queryInterface, logger } }) {
  logger.info(`${loggerPrefix} UPGRADE BEGIN: ${migrationName}`)

  await queryInterface.changeColumn('books', 'coverPath', {
    type: queryInterface.sequelize.Sequelize.STRING(500),
    allowNull: true
  })

  logger.info(`${loggerPrefix} changed books.coverPath to VARCHAR(500)`)
  logger.info(`${loggerPrefix} UPGRADE END: ${migrationName}`)
}

async function down({ context: { queryInterface, logger } }) {
  logger.info(`${loggerPrefix} DOWNGRADE BEGIN: ${migrationName}`)

  await queryInterface.changeColumn('books', 'coverPath', {
    type: queryInterface.sequelize.Sequelize.STRING(255),
    allowNull: true
  })

  logger.info(`${loggerPrefix} reverted books.coverPath to VARCHAR(255)`)
  logger.info(`${loggerPrefix} DOWNGRADE END: ${migrationName}`)
}

module.exports = { up, down }
