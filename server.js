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
app.get('/yelp', getYelps);
// app.get('/trails', getTrails);
app.get('/movies', getMovies);

// port location of server, once its running
app.listen(PORT, () => console.log(`Listening on PORT ${PORT}`));

/**
 *  outputs error to console
 *  if res parameter is passed, also sends response with 500 status code
 *  and error message
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
  let values = [sqlInfo.location_id];

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
      let values = [sqlInfo.location_id];
      client.query(sql, values);
      return;
    }
    return sqlData;
  }
}

/**
 *  retrives location information from local database or
 *  maps.google.com if new location
 *  sends data back by express response object
 * @param {object} req, express request
 * @param {object} res, express response
 */
function getLocation(req, res) {
  const selectSQL = `SELECT * FROM locations where search_query=$1;`;
  const values = [req.query.data];

  client.query(selectSQL, values)
    // .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result.rowCount > 0) {
        res.send(result.rows[0]);
      } else {
        const apiUrl = `https://maps.googleapis.com/maps/api/geocode/json?key=${process.env.GOOGLE_MAPS_API_KEY}&address=${req.query.data}`;

        superagent.get(apiUrl)
          .then(apiData => {
            if (!apiData.body.results.length) {
              throw 'NO LOCATION DATA FROM API';
            } else {
              let location = new Location(apiData.body.results[0], req.query);

              let insertSql = `INSERT INTO locations (search_query, formatted_query, latitude, longitude, created_at) VALUES($1, $2, $3, $4, $5) RETURNING id;`;
              let newValues = Object.values(location);

              client.query(insertSql, newValues)
                .then(sqlReturn => {
                  location.id = sqlReturn.rows[0].id;
                  res.send(location);
                });
            }
          });
      }
    })
    .catch(error => handleError(error));
}

/**
 *  retrives 8-day weather forecast from local database or
 *  darksky.net if data is outdated
 *  sends data back by express response object
 * @param {object} req, express request
 * @param {object} res, express response
 */
function getWeather(req, res) {
  let sqlInfo = {
    endpoint: 'weather',
    location_id: req.query.data.id,
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
            if (!apiData.body.daily.data.length) {
              throw 'NO WEATHER DATA FROM API';
            } else {
              const weatherSummaries = apiData.body.daily.data.map(day => {
                let forecast =  new Forecast(day);
                forecast.id = sqlInfo.location_id;

                let insertSQL = `INSERT INTO weathers (forecast, time, created_at, location_id) VALUES ($1, $2, $3, $4);`;
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
 */
function getMeetups(req, res) {
  let sqlInfo = {
    endpoint: 'meetup',
    location_id: req.query.data.id,
  }

  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) {
        res.send(result.rows);
      } else {
        const apiURL = `https://api.meetup.com/find/upcoming_events?lat=${req.query.data.latitude}&lon=${req.query.data.longitude}&sign=true&photo-host=public&page=20&key=${process.env.MEETUP_API_KEY}`;
        superagent.get(apiURL)
          .then(apiData => {
            if (!apiData.body.events.length) {
              throw 'NO EVENT DATA FROM API';
            } else {
              const events = apiData.body.events.map(event => {
                let event_info = new Event(event);
                event_info.id = sqlInfo.location_id;

                let insertSQL = `INSERT INTO meetups (link, name, creation_date, host, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6);`;
                let newValues = Object.values(event_info);

                client.query(insertSQL, newValues);
                return event_info;
              });
              res.send(events);
            }
          });
      }
    })
    .catch(error => handleError(error));
}

/**
 * gets movies related to passed in location and sends it back to user
 * 
 * first checks to see if movie data is available in local database
 * if not, retrieves information from THE MOVIE DB API
 * 
 * @param {object} req, request object for express
 * @param {object} res, response object for express
 */
function getMovies(req, res) {
  let sqlInfo = {
    endpoint: 'movie',
    location_id: req.query.data.id,
  }
  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) { res.send(result.rows); }
      else {
        const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_DB_API_KEY}&language=en-US&page=1&include_adult=false&query=${req.query.data.search_query}`;

        superagent.get(apiUrl)
          .then(apiData => {
            if (!apiData.body.results.length) {
              throw 'NO DATA FROM API';
            } else {
              const movies = apiData.body.results.map(movie => {
                let movie_info = new Movie(movie);
                movie_info.id = sqlInfo.location_id;

                let insertSQL = `INSERT INTO movies (title, overview, average_votes, total_votes, image_url, popularity, released_on, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`;
                let newValues = Object.values(movie_info);

                client.query(insertSQL, newValues);
                return movie_info;
              });
              res.send(movies);
            }
          });
      }
    })
    .catch(error => handleError(error));
}


/**
 * gets business near passed in location and sends it back to user
 * 
 * first checks to see if business data is available in local database
 * if not, retrieves information from YELP API
 * 
 * @param {object} req, request object for express
 * @param {object} res, response object for express
 */
function getYelps(req, res) {
  let sqlInfo = {
    endpoint: 'movie',
    location_id: req.query.data.id,
  }
  getSqlData(sqlInfo)
    .then(sqlData => checkTimeouts(sqlInfo, sqlData))
    .then(result => {
      if (result) { res.send(result.rows); }
      else {
        const apiUrl = `https://api.yelp.com/v3/businesses/search?latitude=${req.query.data.latitude}&longitude=${req.query.data.longitude}`;

        superagent.get(apiUrl)
          .set({'Authorization': `Bearer ${process.env.YELP_API_KEY}`})
          .then(apiData => {
            if (!apiData.body.businesses) {
              throw 'NO DATA FROM API';
            } else {
              const businesses = apiData.body.businesses.map(store => {
                let store_info = new Store(store);
                store_info.id = sqlInfo.location_id;

                let insertSQL = `INSERT INTO yelps (name, image_url, price, rating, url, created_at, location_id) VALUES ($1, $2, $3, $4, $5, $6, $7);`;
                let newValues = Object.values(store_info);

                client.query(insertSQL, newValues);
                return store_info;
              });
              res.send(businesses);
            }
          })
          .catch(error => handleError(error));
      }
    })
    .catch(error => handleError(error));
}

// function getTrails(req, res) {
//   let sqlInfo = {
//     endpoint: 'movie',
//     id: req.query.data.id,
//   }
//   getSqlData(sqlInfo)
//     .then(sqlData => checkTimeouts(sqlInfo, sqlData))
//     .then(result => {
//       if (result) { res.send(result.rows); }
//       else {
//         const apiUrl = `https://api.themoviedb.org/3/search/movie?api_key=${api_key}&language=en-US&page=1&include_adult=false&query=${location_name}`;

//         superagent.get(apiUrl)
//           .then(apiData => {
//             if (/** api data not available */) {
//               throw 'NO DATA FROM API';
//             } else {
//               /** do something with api data */
//             }
//           });
//       }
//     })
//     .catch(error => handleError(error));
// }


// Event object constructor
function Event(data){
  this.link = data.link;
  this.name = data.name;
  this.creation_date = formatTime(data.created);
  this.host = data.group.name;
  this.created_at = Date.now();
}

// Location object constructor
function Location(data, query) {
  this.search_query = query.data;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
  this.created_at = Date.now();
}

// Forecast object constructor
function Forecast(day) {
  this.forecast = day.summary;
  this.time = formatTime(day.time*1000);
  this.created_at = Date.now();
}

function Store(store) {
  this.name = store.name;
  this.image_url = store.image_url;
  this.price = store.price;
  this.rating = store.rating;
  this.url = store.url;
  this.created_at = Date.now();
}

function Movie(movie) {
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = `http://image.tmdb.org/t/p/w500${movie.poster_path}`;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
  this.created_at = Date.now();
}

// converts millisecond time to 'Day Month Date Year' format
function formatTime(msTime) {
  return new Date(msTime).toString().slice(0,15);
}
