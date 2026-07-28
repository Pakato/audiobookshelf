const { expect } = require('chai')
const sinon = require('sinon')
const { Sequelize } = require('sequelize')
const { wrapForDialect, normalizeTableName } = require('../../../server/utils/migrationQueryInterface')

describe('migrationQueryInterface', () => {
  describe('normalizeTableName', () => {
    it('should lower case string table names', () => {
      expect(normalizeTableName('libraryItems')).to.equal('libraryitems')
    })

    it('should lower case the tableName of schema-qualified objects', () => {
      expect(normalizeTableName({ tableName: 'Series', schema: 'public' })).to.deep.equal({ tableName: 'series', schema: 'public' })
    })

    it('should pass through other values untouched', () => {
      expect(normalizeTableName(undefined)).to.equal(undefined)
    })
  })

  describe('sqlite', () => {
    it('should return the query interface unwrapped', () => {
      const sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false })
      const queryInterface = sequelize.getQueryInterface()

      expect(wrapForDialect(queryInterface)).to.equal(queryInterface)
    })
  })

  describe('postgres', () => {
    let sequelize
    let queryInterface

    beforeEach(() => {
      sequelize = new Sequelize('postgres://u:p@localhost:5432/db', { dialect: 'postgres', quoteIdentifiers: false, logging: false })
      queryInterface = sequelize.getQueryInterface()
    })

    afterEach(() => {
      sinon.restore()
    })

    it('should lower case the table name for catalog lookups', async () => {
      // postgres folds unquoted identifiers, so the real relation names are lower case
      const queries = []
      sinon.stub(sequelize, 'query').callsFake(async (sql) => {
        queries.push(sql)
        return [[], []]
      })

      const wrapped = wrapForDialect(queryInterface)
      await wrapped.tableExists('migrationsMeta')
      await wrapped.showIndex('Series')

      expect(queries[0]).to.contain("table_name = 'migrationsmeta'")
      expect(queries[0]).to.not.contain('migrationsMeta')
      expect(queries[1]).to.contain("relname = 'series'")
    })

    it('should swallow duplicate index errors on addIndex', async () => {
      const error = new Error('relation "unique_series_name_per_library" already exists')
      error.parent = { code: '42P07' }
      sinon.stub(queryInterface, 'addIndex').rejects(error)

      const wrapped = wrapForDialect(queryInterface)

      expect(await wrapped.addIndex('Series', ['name', 'libraryId'])).to.equal(null)
    })

    it('should rethrow index errors that are not duplicates', async () => {
      const error = new Error('some other failure')
      error.parent = { code: '42601' }
      sinon.stub(queryInterface, 'addIndex').rejects(error)

      const wrapped = wrapForDialect(queryInterface)

      let thrown = null
      await wrapped.addIndex('Series', ['name']).catch((e) => (thrown = e))
      expect(thrown).to.equal(error)
    })

    it('should swallow missing index errors on removeIndex', async () => {
      const error = new Error('index "nope" does not exist')
      error.original = { code: '42704' }
      sinon.stub(queryInterface, 'removeIndex').rejects(error)

      const wrapped = wrapForDialect(queryInterface)

      expect(await wrapped.removeIndex('Series', 'nope')).to.equal(null)
    })
  })
})
