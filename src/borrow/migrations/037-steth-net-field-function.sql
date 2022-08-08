TRUNCATE TABLE aave.reserve_data_updated;

ALTER TABLE aave.reserve_data_updated ADD COLUMN reserve varchar
(50);

DELETE FROM vulcan2x.job WHERE name LIKE 'aave-lending-pool-transformer%';

CREATE INDEX vulcan2x_block_timestamp_index ON vulcan2x.block (timestamp);

CREATE OR REPLACE FUNCTION api.aave_yield_rate_steth_eth
(start_date date, end_date date, multiple decimal) 
RETURNS decimal
LANGUAGE SQL
AS
$$

WITH
    reward_apr
    AS
    (

        SELECT
            date_trunc('day',b.timestamp at time zone 'utc') AS date,
            (post_total_pooled_ether - pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
       (pre_total_pooled_ether * time_elapsed) * 100 * 0.9 AS current_steth_reward_apr
        FROM lido.post_total_shares lpts
            JOIN vulcan2x.block b ON lpts.block_id = b.id
        ORDER BY timestamp DESC

    ),


    borrow_rates
    AS
    (

        SELECT avg(stable_borrow_rate) / 1e27 * 100 AS stable_borrow_rate, avg(variable_borrow_rate) * 100 / 1e27 AS variable_borrow_rate,

            date_trunc('day', b.timestamp at time zone 'utc') AS date

        FROM aave.reserve_data_updated rdu
            JOIN vulcan2x.block b ON rdu.block_id = b.id
        WHERE rdu.reserve = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

        GROUP BY date
        ORDER BY date DESC
    )


SELECT avg(current_steth_reward_apr * multiple - variable_borrow_rate * (multiple - 1)) AS net_annualised_yield
FROM
    borrow_rates br
    JOIN reward_apr ra ON br.date = ra.date
WHERE br.date >= start_date AND br.date <= end_date
$$;
