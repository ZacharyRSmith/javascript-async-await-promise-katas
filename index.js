const map = async (promises) => {
  const results = Array(promises.length);
  for (let i = promises.length - 1; i > -1; i--) {
    const p = promises[i];
    const result = await p()
    results.push(result);
    results[i] = result
  }
  return results;
};

const eachSeries = async (ps) => {
  const results = Array(ps.length);
  for (let i = 0; i < ps.length; i++) {
    results[i] = await ps[i]();
  }
  return results;
};

const eachLimit = (ps, limit) => {
  return new Promise((resolve) => {
    const results = Array(ps.length);
    let concurrency = 0;
    let i = -1;

    const next = async () => {
      i += 1;
      const thisI = i;
      if (thisI >= ps.length) {
        if (concurrency === 0) return void resolve(results);
        return;
      }
      concurrency += 1;
      // TODO abstract this logging pattern into decorator
      // console.log(Array(thisI).fill('\t').join(''), 'start', thisI);
      results[thisI] = await ps[thisI]();
      // console.log(Array(thisI).fill('\t').join(''), 'end', thisI);
      concurrency -= 1;
      next();
    };

    next();
    next();
  });
};

const each = (coll, iter) => {
  const idxToKey = {};
  const ps = [];

  Object.keys(coll).forEach((k, i) => {
    idxToKey[i] = k;
    ps.push(iter(coll[k]))
  });

  return Promise.all(ps)
    .then(results => results.reduce((memo, result, i) => {
      return Object.assign(memo, { [idxToKey[i]]: result });
    }, {}));
};

const reduce = async (coll, memo, iter) => {
  let res = memo;
  if (Array.isArray(coll)) {
    for (let i = 0; i < coll.length; i++) {
      const item = coll[i];
      res = await iter(res, item);
    }
  } else {
    for (let k in coll) {
      if (!coll.hasOwnProperty(k)) continue;
      const item = coll[k];
      res = await iter(res, item);
    }
  }
  return res;
};

// ENHANCE: run in parallel
const reject = async (coll, iter) => {
  // const res =
  let ps;
  if (Array.isArray(coll)) {
    ps = coll.reduce((memo, item) => {
      return memo.concat((async () => {
        try {
          await iter(item);
          return { error: null, value: item };
        } catch (error) {
          return { error, value: item };
        }
      })());
    }, []);
  }
  return Promise.all(ps)
    .then((results) => {
      return results.reduce((memo, result) =>
        result.error ? memo.concat(result.value) : memo, []);
    });
};

const groupBy = async (coll, iter) => {
  const itemToKey = new Map();
  const ps = coll.reduce((memo, item) => {
    return memo.concat((async () => {
      const k = await iter(item);
      itemToKey.set(item, k);
      return { v: item, k };
    })());
  }, []);
  return Promise.all(ps)
    .then(() => {
      return coll.reduce((memo, item) => {
        const k = itemToKey.get(item);
        if (!memo[k]) memo[k] = [];
        memo[k].push(item);
        return memo;
      }, {});
    });
};

const auto = (tasks) => new Promise((resolve) => {
  const initTasks = [];
  const finalResults = {};
  const pendingTasks = new Set();
  const tasksState = {};
  const resolveIfDone = () => {
    if (pendingTasks.size) return;
    resolve(finalResults);
  };
  const getTaskState = (k) => {
    if (!tasksState[k]) {
      tasksState[k] = {
        children: new Set(),
        deps: new Set()
      };
    }
    return tasksState[k];
  };
  Object.keys(tasks).forEach(taskName => {
    pendingTasks.add(taskName);
    const task = tasks[taskName];
    const taskState = getTaskState(taskName);

    if (Array.isArray(task)) {
      task.slice(0, -1).forEach(dep => {
        getTaskState(dep).children.add(taskName);
        taskState.deps.add(dep);
      });
    } else {
      initTasks.push({ taskName, task });
    }
  });
  const handleTaskOutcome = ({ results, taskName }) => {
    pendingTasks.delete(taskName);
    finalResults[taskName] = results;
    if (getTaskState(taskName).children.size) {
      Array.from(getTaskState(taskName).children).forEach((child) => {
        tasks[child].slice(-1)[0](finalResults)
          .then((childResults) => {
            handleTaskOutcome({ results: childResults, taskName: child });
          });
      });
    } else {
      resolveIfDone();
    }
  };

  initTasks.forEach(({ task, taskName }) => {
    task((err, results) => {
      handleTaskOutcome({ results, taskName });
    });
  });
});

module.exports = {
  // Collections:
  map,
  eachLimit,
  eachSeries,
  each,
  groupBy,
  reduce,
  reject,

  // Control Flow:
  auto
};
