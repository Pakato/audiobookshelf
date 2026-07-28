const { isPostgres } = require('./sqlDialectHelpers')

/**
 * Sequelize is configured with `quoteIdentifiers: false` for postgres, so all DDL is emitted
 * unquoted and postgres folds every table, column and index name to lower case. The catalog
 * introspection helpers (`tableExists`, `describeTable`, `showIndex`, `showConstraints`) compare
 * the name they are given against `information_schema`/`pg_class` as a *string literal*, so
 * passing the camelCase name used throughout the codebase never matches the folded name that
 * actually exists.
 *
 * Migrations rely on those helpers to decide whether their work has already been done, so the
 * mismatch makes every guard silently report "missing" and the migration then fails trying to
 * re-create an object that is already there.
 *
 * These wrappers normalize the name for lookups, and make index creation/removal idempotent so
 * guards that compare against a camelCase index name (which postgres also folded) stay correct.
 */

// Introspection helpers that embed the table name as a string literal in a catalog query
const TABLE_NAME_LOOKUPS = ['tableExists', 'describeTable', 'showIndex', 'showIndexes', 'showConstraints', 'getForeignKeyReferencesForTable']

const DUPLICATE_TABLE_OR_INDEX = '42P07'
const UNDEFINED_OBJECT = '42704'

/**
 * Lower case a table name the same way postgres does for unquoted identifiers
 * @param {string|{tableName: string}} tableName
 * @returns {string|{tableName: string}}
 */
function normalizeTableName(tableName) {
  if (typeof tableName === 'string') return tableName.toLowerCase()
  if (tableName && typeof tableName.tableName === 'string') {
    return { ...tableName, tableName: tableName.tableName.toLowerCase() }
  }
  return tableName
}

/**
 * @param {Error} error
 * @returns {string} postgres error code, or empty string
 */
function errorCode(error) {
  return error?.parent?.code || error?.original?.code || ''
}

/**
 * Wrap a QueryInterface so migrations behave the same on postgres as they do on sqlite.
 * Returns the query interface untouched for any other dialect.
 *
 * @param {import('sequelize').QueryInterface} queryInterface
 * @param {import('../Logger')} [logger]
 * @returns {import('sequelize').QueryInterface}
 */
function wrapForDialect(queryInterface, logger) {
  if (!queryInterface || !isPostgres(queryInterface.sequelize)) return queryInterface

  const wrapper = Object.create(queryInterface)

  for (const method of TABLE_NAME_LOOKUPS) {
    if (typeof queryInterface[method] !== 'function') continue
    wrapper[method] = (tableName, ...args) => queryInterface[method](normalizeTableName(tableName), ...args)
  }

  if (typeof queryInterface.addIndex === 'function') {
    wrapper.addIndex = async (...args) => {
      try {
        return await queryInterface.addIndex(...args)
      } catch (error) {
        if (errorCode(error) !== DUPLICATE_TABLE_OR_INDEX) throw error
        logger?.info(`[migrationQueryInterface] Index already exists, skipping: ${error.parent?.message || error.message}`)
        return null
      }
    }
  }

  if (typeof queryInterface.removeIndex === 'function') {
    wrapper.removeIndex = async (...args) => {
      try {
        return await queryInterface.removeIndex(...args)
      } catch (error) {
        if (errorCode(error) !== UNDEFINED_OBJECT) throw error
        logger?.info(`[migrationQueryInterface] Index does not exist, skipping: ${error.parent?.message || error.message}`)
        return null
      }
    }
  }

  return wrapper
}

module.exports = { wrapForDialect, normalizeTableName }
