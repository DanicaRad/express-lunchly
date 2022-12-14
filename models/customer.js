/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes, numres }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
    this.numRes = numres;
  }

  get notes() {
    return this._notes;
  }

  set notes(notes) {
    if(!notes) {
      this._notes = "";
    }
    this._notes = notes;
  }

  get fullName() {
    return this.firstName + " " + this.lastName;
  }


  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes
       FROM customers
       ORDER BY last_name, first_name`
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id, 
         first_name AS "firstName",  
         last_name AS "lastName", 
         phone, 
         notes 
        FROM customers WHERE id = $1`,
      [id]
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** save this customer. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes]
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers SET first_name=$1, last_name=$2, phone=$3, notes=$4
             WHERE id=$5`,
        [this.firstName, this.lastName, this.phone, this.notes, this.id]
      );
    }
  }

  /** search for customer/s by name. */

  static async search(name) {
    const names = name.split(" ").map(n => '%' + n + '%');
    const result = await db.query(
      `SELECT id, 
        first_name AS "firstName",  
        last_name AS "lastName", 
        phone, 
        notes 
      FROM customers WHERE
        first_name ILIKE ANY ($1)
        OR last_name ILIKE ANY ($1)`, [names]);
    if(result.rowCount === 0) {
      const err = new Error(`Could not find customers matching ${name}`);
      err.status = 400;
      throw err;
    }
    return result.rows.map(c => new Customer(c));
  }

  /** find top 10 customers with most reservations */

  static async bestCustomers() {
    const result = await db.query(
      `SELECT c.id AS "id",
        c.first_name AS "firstName",
        c.last_name AS "lastName",
        c.phone AS "phone",
        c.notes AS "notes",
        COUNT(r.customer_id) AS numRes
      FROM reservations AS r
        RIGHT JOIN customers AS c
          ON r.customer_id = c.id
      GROUP BY c.id
        ORDER BY numRes DESC
        LIMIT 10`
    );

    return result.rows.map(c => new Customer(c));
  }
}

module.exports = Customer;
