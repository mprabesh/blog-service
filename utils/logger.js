const info = (...params) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(...params);
  }
};

const error = (...params) => {
  if (process.env.NODE_ENV !== "test") {
    console.error(...params);
  }
};

const warn = (...params) => {
  if (process.env.NODE_ENV !== "test") {
    console.warn(...params);
  }
};

const debug = (...params) => {
  if (process.env.NODE_ENV !== "test") {
    console.log(...params);
  }
};

module.exports = { info, error, warn, debug };
