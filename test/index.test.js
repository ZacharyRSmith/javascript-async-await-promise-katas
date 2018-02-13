const assert = require('assert');
const { expect } = require('chai');
const uuidv1 = require('uuid/v1');

const MAX_FUZZ = 10;
const MIN_FUZZ = 1;

const p = require('../index');

const fuzz = (cb) => {
  const ms = Math.max(Math.random() * MAX_FUZZ, MIN_FUZZ);
  if (typeof cb === 'function') {
    setTimeout(cb, ms);
  } else {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
};

describe('kata', () => {
  describe('pmap()', () => {
    it('maintains promise order', done => {
      const recursiveTest = (n) => {
        if (n > 100) {
          return void done();
        }
        const p1 = () => new Promise((resolve) => {
          const invokedAt = uuidv1();
          return resolve({
            invokedAt,
            value: 'r1'
          });
        });
        const p2 = () => new Promise((resolve) => {
          const invokedAt = uuidv1();
          return resolve({
            invokedAt,
            value: 'r2'
          });
        });

        p.map([p1, p2])
          .then(([r1, r2]) => {
            expect(r1.value).to.equal('r1');
            expect(r2.value).to.equal('r2');
          })
          .catch(done);
        recursiveTest(n + 1);
      };
      recursiveTest(1);
    });
  });

  describe('eachSeries()', () => {
    it('eachSeries() invokes @ps in series', done => {
      const p1 = () => new Promise((resolve) => {
        const invokedAt = uuidv1();
        setTimeout(() => {
          resolve({
            invokedAt,
            resolvedAt: uuidv1(),
            value: 'p1'
          });
        }, Math.random());
      });
      const p2 = () => new Promise((resolve) => {
        const invokedAt = uuidv1();
        setTimeout(() => {
          resolve({
            invokedAt,
            resolvedAt: uuidv1(),
            value: 'p2'
          });
        }, Math.random());
      });

      p.eachSeries([p1, p2])
        .then(([r1, r2]) => {
          expect(r1.resolvedAt < r2.invokedAt).to.equal(true);
          done();
        })
        .catch(done);
    });
  });

  describe('eachLimit()', () => {
    it('invokes up to @limit promises at a time', done => {
      const makePromiseMaker = (n) => async () => {
        const invokedAt = uuidv1();
        await fuzz();
        return {
          invokedAt,
          resolvedAt: uuidv1(),
          value: `p${n}`
        };
      };
      const ps = Array(5).fill(null).map((item, i) => makePromiseMaker(i));

      p.eachLimit(ps, 2)
        .then((results) => {
          results.forEach((olderResult, i) => {
            results.slice(i + 1).forEach(newerResult => {
              expect(olderResult.invokedAt < newerResult.invokedAt);
            });
          });
          results.reduce((pendingPs, p) => {
            if (pendingPs.length < 2) return pendingPs.concat(p);
            const resolvedP = pendingPs.find(pendingP => pendingP.resolvedAt < p.invokedAt);
            if (!resolvedP) throw new Error('BOOM!');
            pendingPs.splice(pendingPs.indexOf(resolvedP), 1);
            return pendingPs.concat(p);
          }, []);
          done();
        })
        .catch(done);
    });
  });

  describe('each()', () => {
    it('can handle @coll as an object', async () => {
      const coll = {
        p: 'bar',
        ham: 'bone'
      };
      const iter = (item) => Promise.resolve(`${item}.p`);
      const res = await p.each(coll, iter);
      assert.deepEqual(res, {
        p: 'bar.p',
        ham: 'bone.p'
      });
    });
  });

  describe('reduce()', () => {
    it('works', async () => {
      const coll = [1,2,3];
      const iter = async (memo, item) => {
        await fuzz();
        return memo + item;
      };
  
      assert.equal(await p.reduce(coll, 0, iter), 6);
    });

    it('works with objects', async () => {
      const coll = {
        p: 'bar',
        hello: 'world'
      };
      const iter = async (memo, item) => {
        await fuzz();
        return memo + item;
      };

      assert.equal(await p.reduce(coll, '', iter), 'barworld');
    });

    it('works with strings', async () => {
      const coll = 'foo';
      const iter = async (memo, item) => {
        await fuzz();
        return memo + item + 'a';
      };

      assert.equal(await p.reduce(coll, '', iter), 'faoaoa');
    });
  });

  describe('reject()', () => {
    it('works', async () => {
      const coll = [1, 2, 3, 4];
      const iter = async (filePath) => {
        await fuzz();
        if (filePath % 2) throw new Error(`File '${filePath}' does not exist!`);
      };      

      assert.deepEqual(await p.reject(coll, iter), [1, 3]);
    });
  });

  describe('groupBy()', () => {
    it('works', async () => {
      const coll = ['userId1', 'userId2', 'userId3'];
      const iter = async (userId) => {
        await fuzz();
        return userId === 'userId2' ? 42 : 30;
      };

      const expected = { 30: ['userId1', 'userId3'], 42: ['userId2'] };
      assert.deepEqual(await p.groupBy(coll, iter), expected);
    });
  });

  xdescribe('papply()', () => {
    it('works', async () => {

    });
  });

  describe('auto()', () => {
    it('works', async () => {
      const mockFs = {
        readFile: (filePath, opts, cb) => {
          fuzz(() => cb(null, 'file contents'));
        }
      };

      const actual = await p.auto({
        extract: cb => mockFs.readFile('data.txt', 'utf-8', cb),
        transform: ['extract', async (results) => {
          assert.equal(results.extract, 'file contents');
          await fuzz();
          return results.extract + 'TRANSFORMED';
        }]
      });

      const expected = {
        extract: 'file contents',
        transform: 'file contentsTRANSFORMED'
      };
      assert.deepEqual(actual, expected);
    });
  });
});
