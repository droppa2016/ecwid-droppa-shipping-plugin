const ErrorResponse = require('../utils/errorResponse');

const errorHandler = (error, req, res, next) => {
  let err = {
    ...error
  };

  err.message = error.message;

  //   console.log(error);

  //   Bad ObjectId (CastError)
  if (error.name === 'CastError') {
    const message = `Recource not found with id of ${error.value}`;
    err = new ErrorResponse(message, 404);
  }

  //   Handle duplication
  if (error.code === 11000) {
    const message = 'Duplicate field value entered.';
    err = new ErrorResponse(message, 400);
  }

  res.status(err.statusCode || 500).json({
    message: err.message || 'Server Threw An Error.'
  });
}

module.exports = errorHandler;
