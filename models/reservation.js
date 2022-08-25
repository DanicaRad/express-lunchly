/** Reservation for Lunchly */

const moment = require("moment");
const dayjs = require('dayjs');
const Customer = require("./customer");

const db = require("../db");
const { weekdays } = require("moment");


/** A reservation for a party */

class Reservation {
  constructor({id, customerId, numGuests, startAt, notes}) {
    this.id = id;
    this._customerId = customerId;
    this.numGuests = numGuests;
    this.startAt = startAt;
    this.notes = notes;
  }

  /** get/set for customerID */
  get customerId() {
    return this._customerId;
  }

  set customerId(id) {
    if(id !== this._customerId) {
      const err = new Error(`Cannot reassign value of customerId.`);
      err.status = 400;
      throw err;
    }
    this._customerId = id;
  }

  /** formatter for startAt */
  get startAt() {
    return this._startAt;
  }

  set startAt(date) {
    if(!moment.isDate(date)) {
      const err = new Error(`Reservation start is not a valid date. Must be formated as YYYY-MM-DD hh:mm am/pm like 2022-08-27 6:00 pm.`);
      err.status = 400;
      throw err;
    }
    this._startAt = date;
  }

  getformattedStartAt() {
    return moment(this.startAt).format('MMMM Do YYYY, h:mm a');
  }

  /** given a customer id, find their reservations. */

  static async getReservationsForCustomer(customerId) {
    const results = await db.query(
          `SELECT id, 
           customer_id AS "customerId", 
           num_guests AS "numGuests", 
           start_at AS "startAt", 
           notes AS "notes"
         FROM reservations 
         WHERE customer_id = $1`,
        [customerId]
    );

    return results.rows.map(row => new Reservation(row));
  }

  async save() {
    if(this.numGuests <= 0) {
      const err = new Error(`1 or more guests required to make reservation.`);
      err.status = 400;
      throw err;
    }
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO reservations (customer_id, start_at, num_guests, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id, start_at AS "startAt", notes`,
        [this.customerId, this.startAt, this.numGuests, this.notes]
      );

      this.id = result.rows[0].id;
      this.startAt = result.rows[0].startAt;
      this.notes = result.rows[0].notes;

    } else {
      await db.query(
        `UPDATE reservations SET start_at=$1, num_guests=$2, notes=$3
             WHERE id=$5`,
        [this.startAt, this.numGuests, this.notes, this.id]
      );
    }
  }
}


module.exports = Reservation;
