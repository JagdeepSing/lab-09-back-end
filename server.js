'use strict';

// environment variables
require('dotenv').config();

const superagent = require('superagent');
const express = require('express');
const pg = require('pg');
const cors = require('cors');

// application setup
const app = express();
const PORT = process.env.PORT;

// middleware
app.use(cors());

// create client connection to database
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('error', err => console.error(err));

// routes
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/meetups', getMeetups);
// TODO: app.get('/yelp', getYelp);
// TODO: app.get('/trails', getTrails);
// TODO: app.get('/movies', getMovies);

// port location of server, once its running
app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));

/**
 *  outputs error to console
 *  if res parameter is passed, also sends response with 500 status code
 *  and error message
 * 
 * @param {string} err, error that is outputed
 * @param {object} res, express response
 */
function handleError(err, res) {
  console.error(err);
  if (res) res.status(500).send('Sorry, something went wrong');
}

// HELPER FUNCTIONS

/**
 * checks database for data on passed in object
 *  @param {object} sqlInfo, object with keys endpoint and id
 */
function getSqlData(sqlInfo) {
  let sql = `SELECT * FROM ${sqlInfo.endpoint}s WHERE location_id=$1;`;
  let values = [sqlInfo.id];

  // return data
  try {
    return client.query(sql, values);
  } catch(error) {
    handleError(error);
  }
}

// max data age for each route data
//  form: (milliseconds) * (seconds) * (minutes) * (hours) * (days)
const timeouts = {
  weather: 1000 * 15, // 15 seconds
  meetup: 1000 * 60 * 60 * 6, // 6 hours
  yelp: 1000 * 60 * 60 * 24, // 24 hours
  movie: 1000 * 60 * 60 * 24 * 30, // 30 hours
  trail: 1000 * 60 * 60 * 24 * 7, // 7 hours
}

/**
 * check age of data, 
 *  if its within our timeout limit returns data
 *  else delete data from database and returns undefined
 * @param {object} sqlInfo 
 * @param {object} sqlData 
 */
function checkTimeouts(sqlInfo, sqlData) {
  if (sqlData.rowCount > 0) {
    let ageOfResults = Date.now() - sqlData.rows[0].created_at;

    if (ageOfResults > timeouts[sqlInfo.endpoint]) {
      let sql = `DELETE FROM ${sqlInfo.endpoint}s WHERE location_id=$1;`;
      let values = [sqlInfo.id];
      client.query(sql, values);
      return;
    }
    return sqlData;
  }
}

/**
 *  retrives location information from local database or 
 *  maps.google.com if new location
 * 
 *  sends data back by express response object
 * 
 * @param {object} req, express request
 * @param {object} res, express response
 */
function getLocation(req, res) {
  let query = req.query.data;

  // Define the search query
  let sql = `SELECT * FROM locations WHERE search_query=$1;`;
  let values = [query]; // always an array

  // make the query of the database
  client.query(sql, values)
    .then(sqlResult => {
      // check if location was found
      if (sqlResult.rowCount > 0) {
        res.send(sqlResult.rows[0]);
      } else {
        // if not found in sql, get from API
        const mapsURL = `https://maps.googleapis.com/maps/api/geocode/json?key=${process.env.GOOGLE_MAPS_API_KEY}&address=${query}`;

        superagent.get(mapsURL)
          //if successfully obtained API data
          .then(apiData => {
            if (!apiData.body.results.length) { 
              throw 'NO LOCATION DATA'; 
            } else {
              let location = new Location(apiData.body.results[0], req.query);
              
              //inserting new data into the database
              let insertSql = `INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) RETURNING id;`;
              let newValues = Object.values(location);
              
              // make query
              client.query(insertSql, newValues)
                //if successfully inserted into database
                .then(sqlReturn => {
                  // attach returned id onto the location object
                  location.id = sqlReturn.rows[0].id;
                  res.send(location);
                })
                //if not successfully inputted into database, catch error
                .catch(error => handleError(error));
            }
          })
          //if not successfully obtained API data, catch error
          .catch(error => handleError(error));
      }
    })
    //anything related to getting data out of the database
    .catch(error => handleError(error));
}

/**
 *  retrives 8-day weather forecast from local database or 
 *  darksky.net if data is outdated
 * 
 *  sends data back by express response object
 * 
 * @param {object} req, express request
 * @param {object} res, express response
 */
function getWeather(req, res) {
  let sqlInfo = {
    endpoint: 'weather',
    id: req.query.data.id,
  }
  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) {
        res.send(result.rows);
      } else {
        const weatherApiUrl = `https://api.darksky.net/forecast/${process.env.DARK_SKY_API_KEY}/${req.query.data.latitude},${req.query.data.longitude}`;

        superagent.get(weatherApiUrl)
          .then(apiData => {
            if (apiData.body.daily.data.length === 0) {
              throw 'NO WEATHER DATA FROM API';
            } else {
              const weatherSummaries = apiData.body.daily.data.map(day => {
                let forecast =  new Forecast(day);
                forecast.id = sqlInfo.id;

                let insertSQL = 'INSERT INTO weathers (forecast, time, created_at, location_id) VALUES ($1, $2, $3, $4);';
                let newValues = Object.values(forecast);

                client.query(insertSQL, newValues);

                return forecast;
              });
              res.send(weatherSummaries);
            }
          });
      }
    })
    .catch(error => handleError(error));
}

/**
 *  retrives upcoming meetups from local database or 
 *  meetups.com if data is outdated
 * 
 *  sends data back by express response object
 * 
 * @param {object} req, express request
 * @param {object} res, express response
 * @return {array} array of event objects
 */
function getMeetups(req, res) {
  let locID = req.query.data.id;

  let sql = `SELECT * FROM meetups WHERE location_id=$1;`;
  let values = [locID];

  client.query(sql, values)
    .then(sqlResult => {
      if (sqlResult.rowCount > 0) {
        res.send(sqlResult.rows);
      } else {
        const meetup_url = `https://api.meetup.com/find/upcoming_events?lat=${req.query.data.latitude}&lon=${req.query.data.longitude}&sign=true&photo-host=public&page=20&key=${process.env.MEETUP_API_KEY}`;

        superagent.get(meetup_url)
          .then (apiData => {
            if (apiData.body.events.length === 0) {
              throw 'NO EVENT DATA';
            } else {
              const events = apiData.body.events.map(event => {
                let event_info = new Event(event);
                event_info.id = locID;

                let insertSql = `INSERT INTO meetups (link, name, creation_date, host, location_id) VALUES ($1, $2, $3, $4, $5);`;
                let values = Object.values(event_info);

                client.query(insertSql, values);
                return event_info;
              });
              res.send(events);
            }
          })
          .catch(error => handleError(error));
      }
    })
    .catch(error => handleError(error));
}

function getMovies(req, res) {
  let sqlInfo = {
    endpoint: 'movie',
    id: req.query.data.id,
  }
  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) { res.send(result.rows); }
      else {
        const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${api_key}&language=en-US&page=1&include_adult=false&query=${location_name}`;

        superagent.get(apiUrl)
          .then(apiData => {
            if (/** api data not available */) {
              throw 'NO DATA FROM API';
            } else {
              /** do something with api data */
            }
          });
      }
    })
    .catch(error => handleError(error));
}

function getTrails(req, res) {
  let sqlInfo = {
    endpoint: 'movie',
    id: req.query.data.id,
  }
  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) { res.send(result.rows); }
      else {
        const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${api_key}&language=en-US&page=1&include_adult=false&query=${location_name}`;

        superagent.get(apiUrl)
          .then(apiData => {
            if (/** api data not available */) {
              throw 'NO DATA FROM API';
            } else {
              /** do something with api data */
            }
          });
      }
    })
    .catch(error => handleError(error));
}

function getYelps(req, res) {
  let sqlInfo = {
    endpoint: 'movie',
    id: req.query.data.id,
  }
  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) { res.send(result.rows); }
      else {
        const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${api_key}&language=en-US&page=1&include_adult=false&query=${location_name}`;

        superagent.get(apiUrl)
          .then(apiData => {
            if (/** api data not available */) {
              throw 'NO DATA FROM API';
            } else {
              /** do something with api data */
            }
          });
      }
    })
    .catch(error => handleError(error));
}

// Event object constructor
function Event(data){
  this.link = data.link;
  this.name = data.name;
  this.creation_date = formatTime(data.created);
  this.host = data.group.name;
}

// Location object constructor
function Location(data, query) {
  this.search_query = query.data;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

// Forecast object constructor
function Forecast(day) {
  this.forecast = day.summary;
  this.time = formatTime(day.time*1000);
  this.created_at = Date.now();
}

// converts millisecond time to 'Day Month Date Year' format
function formatTime(msTime) {
  return new Date(msTime).toString().slice(0,15);
}