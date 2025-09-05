/**
 * Unit tests for IdGenerator
 */

// Since we're in a browser environment, we need to load the script
const script = document.createElement('script');
script.src = '../../js/utils/idGenerator.js';
document.head.appendChild(script);

describe('IdGenerator', () => {
  beforeEach(() => {
    // Reset counters before each test
    if (window.IdGenerator) {
      window.IdGenerator.reset();
    }
  });

  describe('generate()', () => {
    test('should generate unique IDs', () => {
      const id1 = window.IdGenerator.generate('test');
      const id2 = window.IdGenerator.generate('test');
      
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^test-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
    });

    test('should use provided prefix', () => {
      const nodeId = window.IdGenerator.generate('node');
      const connId = window.IdGenerator.generate('connection');
      
      expect(nodeId).toMatch(/^node-/);
      expect(connId).toMatch(/^connection-/);
    });

    test('should use default prefix when none provided', () => {
      const id = window.IdGenerator.generate();
      expect(id).toMatch(/^id-/);
    });
  });

  describe('generateShort()', () => {
    test('should generate short IDs', () => {
      const id = window.IdGenerator.generateShort('temp');
      
      expect(id).toMatch(/^temp-[a-z0-9]{6}$/);
      expect(id.length).toBeLessThan(20);
    });
  });

  describe('generateUUID()', () => {
    test('should generate valid UUID v4', () => {
      const uuid = window.IdGenerator.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      
      expect(uuid).toMatch(uuidRegex);
    });

    test('should generate unique UUIDs', () => {
      const uuid1 = window.IdGenerator.generateUUID();
      const uuid2 = window.IdGenerator.generateUUID();
      
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('entity-specific generators', () => {
    test('node() should generate node IDs', () => {
      const id = window.IdGenerator.node();
      expect(id).toMatch(/^node-/);
    });

    test('connection() should generate connection IDs', () => {
      const id = window.IdGenerator.connection();
      expect(id).toMatch(/^conn-/);
    });

    test('branch() should generate branch IDs', () => {
      const id = window.IdGenerator.branch();
      expect(id).toMatch(/^branch-/);
    });

    test('version() should generate version IDs', () => {
      const id = window.IdGenerator.version();
      expect(id).toMatch(/^ver-/);
    });
  });

  describe('validation methods', () => {
    test('isValid() should validate ID format', () => {
      const validId = window.IdGenerator.generate('test');
      const invalidIds = [
        'not-valid',
        'test',
        'test-',
        '-test-',
        123,
        null,
        undefined
      ];

      expect(window.IdGenerator.isValid(validId)).toBe(true);
      invalidIds.forEach(id => {
        expect(window.IdGenerator.isValid(id)).toBe(false);
      });
    });

    test('getPrefix() should extract prefix from valid ID', () => {
      const nodeId = window.IdGenerator.node();
      const connId = window.IdGenerator.connection();
      
      expect(window.IdGenerator.getPrefix(nodeId)).toBe('node');
      expect(window.IdGenerator.getPrefix(connId)).toBe('conn');
      expect(window.IdGenerator.getPrefix('invalid')).toBe(null);
    });

    test('type checking methods should work correctly', () => {
      const nodeId = window.IdGenerator.node();
      const connId = window.IdGenerator.connection();
      const branchId = window.IdGenerator.branch();
      
      expect(window.IdGenerator.isNodeId(nodeId)).toBe(true);
      expect(window.IdGenerator.isNodeId(connId)).toBe(false);
      
      expect(window.IdGenerator.isConnectionId(connId)).toBe(true);
      expect(window.IdGenerator.isConnectionId(nodeId)).toBe(false);
      
      expect(window.IdGenerator.isBranchId(branchId)).toBe(true);
      expect(window.IdGenerator.isBranchId(nodeId)).toBe(false);
    });
  });
});

describe('IdMigrator', () => {
  describe('migrate()', () => {
    test('should migrate old format IDs', () => {
      const oldNodeId = 'node-123';
      const oldConnId = 'connection-456';
      
      const newNodeId = window.IdMigrator.migrate(oldNodeId, 'node');
      const newConnId = window.IdMigrator.migrate(oldConnId, 'connection');
      
      expect(newNodeId).not.toBe(oldNodeId);
      expect(newNodeId).toMatch(/^node-migrated-[a-z0-9]+-123$/);
      
      expect(newConnId).not.toBe(oldConnId);
      expect(newConnId).toMatch(/^connection-migrated-[a-z0-9]+-456$/);
    });

    test('should return new ID format unchanged', () => {
      const modernId = window.IdGenerator.node();
      const result = window.IdMigrator.migrate(modernId, 'node');
      
      expect(result).toBe(modernId);
    });

    test('should generate new ID for invalid input', () => {
      const result = window.IdMigrator.migrate(null, 'node');
      
      expect(result).toMatch(/^node-/);
      expect(window.IdGenerator.isValid(result)).toBe(true);
    });
  });

  describe('migrateCollection()', () => {
    test('should migrate array of entities', () => {
      const oldNodes = [
        { id: 'node-1', title: 'Node 1' },
        { id: 'node-2', title: 'Node 2' },
        { id: 'node-3', title: 'Node 3' }
      ];
      
      const migrated = window.IdMigrator.migrateCollection(oldNodes, 'id', 'node');
      
      expect(migrated).toHaveLength(3);
      migrated.forEach((node, index) => {
        expect(node.title).toBe(oldNodes[index].title);
        expect(node.id).not.toBe(oldNodes[index].id);
        expect(node.id).toMatch(/^node-migrated-/);
      });
    });

    test('should maintain ID consistency within collection', () => {
      const oldNodes = [
        { id: 'node-1', title: 'Node 1', parentId: 'node-2' },
        { id: 'node-2', title: 'Node 2', parentId: null }
      ];
      
      const migrated = window.IdMigrator.migrateCollection(oldNodes, 'id', 'node');
      
      // The same old ID should map to the same new ID
      const node1Old = oldNodes.find(n => n.id === 'node-1');
      const node1New = migrated.find(n => n.title === 'Node 1');
      
      expect(node1New.id).toMatch(/^node-migrated-/);
    });
  });
});