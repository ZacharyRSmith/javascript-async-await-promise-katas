const map = (promises) => {
  return Promise.all(promises.map(p => p()));
};

const eachSeries = (ps) => {
  return ps.reduce(
    (mainP, p) => mainP.then(results => p().then(pResults => results.concat(pResults))),
    Promise.resolve([])
  );
};

const eachLimit = (ps, limit) => {
  return new Promise((resolve) => {
    const results = Array(ps.length);
    let concurrency = 0;
    let i = -1;

    const next = () => {
      i += 1;
      const thisI = i;
      if (thisI >= ps.length) {
        if (concurrency === 0) return void resolve(results);
        return;
      }
      concurrency += 1;
      // TODO abstract this logging pattern into decorator
      // console.log(Array(thisI).fill('\t').join(''), 'start', thisI);
      ps[thisI]()
      .then((_results) => {
        results[thisI] = _results;
        concurrency -= 1;
        next();
      });
      // console.log(Array(thisI).fill('\t').join(''), 'end', thisI);
      // concurrency -= 1;
      // next();
    };
    // const next = async () => {
    //   i += 1;
    //   const thisI = i;
    //   if (thisI >= ps.length) {
    //     if (concurrency === 0) return void resolve(results);
    //     return;
    //   }
    //   concurrency += 1;
    //   // TODO abstract this logging pattern into decorator
    //   // console.log(Array(thisI).fill('\t').join(''), 'start', thisI);
    //   results[thisI] = await ps[thisI]();
    //   // console.log(Array(thisI).fill('\t').join(''), 'end', thisI);
    //   concurrency -= 1;
    //   next();
    // };

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

const reduce = (coll, memo, iter) => {
  if (Array.isArray(coll)) {
    return coll.reduce(
      (p, item) => p.then((results) => iter(results, item)),
      Promise.resolve(memo)
    )
  } else {
    return Object.keys(coll).reduce(
      (p, k) => p.then((results) => iter(results, coll[k])),
      Promise.resolve(memo)
    )
  }
};

// ENHANCE: run in parallel
const reject = (coll, iter) => {
  if (Array.isArray(coll)) {
    return coll.reduce(
      (p, item) => p.then((results) =>
        iter(item)
        .then(() => results.concat({ error: null, value: item }))
        .catch(error => results.concat({ error, value: item }))),
      Promise.resolve([])
    )
    .then((results) => {
      return results.reduce((memo, result) =>
        result.error ? memo.concat(result.value) : memo, []);
    });
  }
};

const groupBy = (coll, iter) => {
  const itemToKey = new Map();
  const ps = coll.reduce(
    (p, item) => p.then((results) => iter(item).then((k) => {
      itemToKey.set(item, k);
      return results.concat({ v: item, k });
    })),
    Promise.resolve([])
  );
  return ps
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
