// wrapP() logs when an async function is invoked and its @return Promise has resolved.
// Ex. output:
//  start 0
// 	 start 1
// 	 end 1
// 		 start 2
//  end 0
// 			 start 3
// 		 end 2
// 				 start 4
// 			 end 3
// 				 end 4
// let numPs = 0;
// const wrapP = (p) => () => {
//   const thisPNum = numPs++;
//   console.log(Array(thisPNum).fill('\t').join(''), 'start', thisPNum);
//   return p()
//     .then((results) => {
//       console.log(Array(thisPNum).fill('\t').join(''), 'end', thisPNum);
//       return results;
//     });
// };

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
