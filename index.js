"use strict";

const axios = require('axios');
const Promise = require('bluebird'),
    _       = require('lodash');


Promise.config({
    // Enables all warnings except forgotten return statements.
    warnings: {
        wForgottenReturn: false
    }
});

function Mailchimp (api_key, dc = null) {
  var api_key_regex = /.+\-.+/

  if (!api_key_regex.test(api_key) && dc === null) {
    throw new Error('missing or invalid api key: ' + api_key)
  }


  this.__api_key = api_key;
  if(dc !== null){
    this.__base_url = "https://"+ dc + ".api.mailchimp.com/3.0"
  }else{
    this.__base_url = "https://"+ this.__api_key.split('-')[1] + ".api.mailchimp.com/3.0"
  }
}

var formatPath = function (path, path_params) {

  if (!path) {
    path = '/';
  }

  if (path[0] != '/') {
    path = '/' + path;
  }

  if (!path_params) {
    return path;
  }

  if (_.isEmpty(path_params)) {
    return path;
  }

  path = _.reduce(path_params, function (_path, value, param) {
    return _path.replace('{'+param+'}', value);
  }, path)

  console.log({ mailchimp_path: path })

  return path;

}



Mailchimp.prototype.post = function (options, body, done) {

  console.log(JSON.stringify({ 
    post_options: options,
    post_body: body 
  }));

  options = _.clone(options) || {};

  if (_.isString(options)) {
    options = {
      path : options,
    }
  }
  options.method = 'post';

  if (!done && _.isFunction(body)) {
    done = body;
    body = null;
  }

  if (body && options.body) {
    console.warn('body set on request options overwritten by argument body');
  }

  if (body) {
    options.body = body;
  }

  return this.request(options, done);
}

Mailchimp.prototype.patch = function (options, body, done) {
  console.log(JSON.stringify({ 
    patch_options: options,
    patch_body: body 
  }));

  options = _.clone(options) || {};

  if (_.isString(options)) {
    options = {
      path : options,
    }
  }
  options.method = 'patch';

  if (!done && _.isFunction(body)) {
    done = body;
    body = null;
  }

  if (body && options.body) {
    console.warn('body set on request options overwritten by argument body');
  }

  if (body) {
    options.body = body;
  }

  return this.request(options, done);
}

Mailchimp.prototype.request = function (options, done) {
  console.log(JSON.stringify({ request_options: options }));
  
  var mailchimp = this;
  var promise = new Promise(function(resolve, reject) {
    if (!options) {
      reject(new Error("No request options given"));
      return;
    }

    var path = formatPath(options.path, options.path_params);
    var method = options.method || 'get';
    var body = options.body || {};
    var params = options.params;
    var query = options.query;

    var headers = {
      'User-Agent' : 'mailchimp-api-v3 : https://github.com/initialstate/node-mailchimp'
    };

    // Mailchimp does not respect on the language set in requests bodies for confirmation emails on new subscribers (and maybe other)
    // A workaround is to make sure the language header matches
    var language = options.language || body.language || null;
    if (language) {
      headers['Accept-Language'] = language;
    }

    //Parems used to refer to query parameters, because of the mailchimp documentation.
    if (params) {
      if (!query) {
        query = params;
      }
    }

    if (!path || !_.isString(path)) {
      reject(new Error('No path given'))
      return;
    }

    let axios_req = {
      method : method,
      url : mailchimp.__base_url + path,
      data : body,
      params : query,
      headers : headers,
      responseType: 'json',
    }

    // omitted auth in log
    console.log({ axios_req });

    axios({
      method : method,
      url : mailchimp.__base_url + path,
      auth : {
        user : 'any',
        password : mailchimp.__api_key
      },
      data : body,
      params : query,
      headers : headers,
      responseType: 'json',
    }, function (err, response) {

      if (err) {
        var error = new Error(err);
        console.log('Mailchimp Error', error.response);
        error.response = response;
        error.status = response ? response.status : undefined;
        reject(error)
        return;
      }

      console.log('Mailchimp Response: ', response)

      if (response.status < 200 || response.status > 299) {
        var error = Object.assign(new Error(response.data ? response.data : response.status), response.data || response)
        error.response = response;
        error.status = response.status;
        reject(error);
        return;
      }

      var result = response.data || {};
      result.statusCode = response.status;

      resolve(result)
    })

  })

  //If a callback is used, resolve it and don't return the promise
  if (done) {
    promise
      .then(function (result) {
        done(null, result)
      })
      .catch(function (err) {
        console.log({ mailchimp_err: err })
        done(err);
      })
    return null;
  }

  return promise
}


module.exports = exports = Mailchimp;
