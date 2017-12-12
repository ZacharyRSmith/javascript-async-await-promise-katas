// Collections:
const each = (coll, iter) => {
};

const eachLimit = (ps, limit) => {
};

const eachSeries = async (ps) => {
};

const groupBy = async (coll, iter) => {
};

const map = async (promises) => {
};

const reduce = async (coll, memo, iter) => {
};

const reject = async (coll, iter) => {
};

// Control Flow:
const auto = (tasks) => new Promise((resolve) => {
  resolve({});
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
