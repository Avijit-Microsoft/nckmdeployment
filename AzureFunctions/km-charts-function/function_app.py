import azure.functions as func
import logging
import json
import os
import pymssql
import pandas as pd
# from dotenv import load_dotenv
# load_dotenv()

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

# add post methods - filters will come in the body (request.body), if body is not empty, update the where clause in the query
@app.route(route="get_metrics", methods=["GET"], auth_level=func.AuthLevel.ANONYMOUS)
def get_metrics(req: func.HttpRequest) -> func.HttpResponse:
# select distinct mined_topic from processed_data
    # distinct sentiment from processed_data... union all the results
    data_type = req.params.get('data_type')
    if not data_type:
        data_type = 'filters'

    server = os.environ.get("SQLDB_SERVER")
    database = os.environ.get("SQLDB_DATABASE")
    username = os.environ.get("SQLDB_USERNAME")
    password = os.environ.get("SQLDB_PASSWORD")

    conn = pymssql.connect(server, username, password, database)
    cursor = conn.cursor()
    if data_type == 'filters':
 
        sql_stmt = '''select 'Topic' as filter_name, mined_topic as displayValue, mined_topic as key1 from 
        (SELECT distinct mined_topic from processed_data) t 
        union all
        select 'Sentiment' as filter_name, sentiment as displayValue, sentiment as key1 from 
        (SELECT distinct sentiment from processed_data
        union all select 'all' as sentiment) t
        union all 
        select 'Satisfaction' as filter_name, satisfied as displayValue, satisfied as key1 from
        (SELECT distinct satisfied from processed_data) t
        union all
        select 'DateRange' as filter_name, date_range as displayValue, date_range as key1 from 
        (SELECT 'Last 7 days' as date_range 
        union all SELECT 'Last 14 days' as date_range  
        union all SELECT 'Last 90 days' as date_range  
        union all SELECT 'Year to Date' as date_range  
        ) t'''

        cursor.execute(sql_stmt)
        rows = cursor.fetchall()

        column_names = [i[0] for i in cursor.description]
        df = pd.DataFrame(rows, columns=column_names)

        nested_json = (
        df.groupby("filter_name")
        .apply(lambda x: {
            "filter_name": x.name,
            "filter_values": x.drop(columns="filter_name").to_dict(orient="records")
        }).to_list()
        )

        print(nested_json)
        filters_data = nested_json
        
        json_response = json.dumps(filters_data)
        return func.HttpResponse(json_response, mimetype="application/json", status_code=200)
    # where clauses for the charts data 
    elif data_type == 'charts':
        sql_stmt = '''select 'Total Calls' as id, 'Total Calls' as chart_name, 'card' as chart_type,
        'Total Calls' as name1, count(*) as value1, '' as unit_of_measurement from [dbo].[processed_data]
        union all 
        select 'Average Handling Time' as id, 'Average Handling Time' as chart_name, 'card' as chart_type,
        'Average Handling Time' as name1, 
        AVG(DATEDIFF(MINUTE, StartTime, EndTime))  as value1, 'mins' as unit_of_measurement from [dbo].[processed_data]
        union all 
        select 'Satisfied' as id, 'Satisfied' as chart_name, 'card' as chart_type,
        'Satisfied' as name1, 
        (count(satisfied) * 100 / sum(count(satisfied)) over ()) as value1, '%' as unit_of_measurement from [dbo].[processed_data]
        select 'Total Calls' as id, 'Total Calls' as chart_name, 'card' as chart_type,
        'Total Calls' as name1, count(*) as value1, '' as unit_of_measurement from [dbo].[processed_data]
        union all 
        select 'Average Handling Time' as id, 'Average Handling Time' as chart_name, 'card' as chart_type,
        'Average Handling Time' as name1, 
        AVG(DATEDIFF(MINUTE, StartTime, EndTime))  as value1, 'mins' as unit_of_measurement from [dbo].[processed_data]
        union all 
        select 'Satisfied' as id, 'Satisfied' as chart_name, 'card' as chart_type,
        'Satisfied' as name1, 
        (count(satisfied) * 100 / sum(count(satisfied)) over ()) as value1, '%' as unit_of_measurement from [dbo].[processed_data] 
        where satisfied = 'yes' 
        union all 
        select 'SENTIMENT' as id, 'Topics Overview' as chart_name, 'donutchart' as chart_type, 
        sentiment as name1,
        (count(sentiment) * 100 / sum(count(sentiment)) over ()) as value1, 
        '' as unit_of_measurement from [dbo].[processed_data]  where sentiment = 'positive' group by sentiment
        union all 
        select 'SENTIMENT' as id, 'Topics Overview' as chart_name, 'donutchart' as chart_type, 
        sentiment as name1,
        (count(sentiment) * 100 / sum(count(sentiment)) over ()) as value1, 
        '' as unit_of_measurement from [dbo].[processed_data]  where sentiment = 'negative' group by sentiment
        union all 
        select 'SENTIMENT' as id, 'Topics Overview' as chart_name, 'donutchart' as chart_type, 
        sentiment as name1,
        (count(sentiment) * 100 / sum(count(sentiment)) over ()) as value1, 
        '' as unit_of_measurement from [dbo].[processed_data]  where sentiment = 'neutral' group by sentiment
        union all
        select 'AVG_HANDLING_TIME_BY_TOPIC' as id, 'Average Handling Time By Topic' as chart_name, 'bar' as chart_type,
        mined_topic as name1, 
        AVG(DATEDIFF(MINUTE, StartTime, EndTime)) as value1, '' as unit_of_measurement from [dbo].[processed_data] group by mined_topic
        '''
        #charts pt1
        cursor.execute(sql_stmt)

        rows = cursor.fetchall()

        column_names = [i[0] for i in cursor.description]
        df = pd.DataFrame(rows, columns=column_names)

        # charts pt1
        nested_json1 = (
            df.groupby(['id', 'chart_name', 'chart_type']).apply(lambda x: x[['name1', 'value1', 'unit_of_measurement']].to_dict(orient='records')).reset_index(name='chart_value')
            
        )
        result1 = nested_json1.to_dict(orient='records')
        # json_data1 = json.dumps(result, indent=4)
        # print(json_data)

        sql_stmt = '''select mined_topic as name, 'Topics' as id, 'Trending Topics' as chart_name, 'table' as chart_type, call_frequency,
        case when avg_sentiment < 1 THEN 'negative' when avg_sentiment between 1 and 2 THEN 'neutral' 
        when avg_sentiment >= 2 THEN 'positive' end as average_sentiment
        from
        (
            select mined_topic, AVG(sentiment_int) as avg_sentiment, sum(n) as call_frequency
            from 
            (
                select TRIM(mined_topic) as mined_topic, 1 as n,
                CASE sentiment WHEN 'positive' THEN 3 WHEN 'neutral' THEN 2 WHEN 'negative' THEN 1 end as sentiment_int
                from [dbo].[processed_data]
            ) t
            group by mined_topic
        ) t1'''

        cursor.execute(sql_stmt)

        rows = cursor.fetchall()

        column_names = [i[0] for i in cursor.description]
        df = pd.DataFrame(rows, columns=column_names)

        # charts pt2
        nested_json2 = (
            df.groupby(['id', 'chart_name', 'chart_type']).apply(lambda x: x[['name', 'call_frequency', 'average_sentiment']].to_dict(orient='records')).reset_index(name='chart_value')
            
        )
        result2 = nested_json2.to_dict(orient='records')

        sql_stmt = '''select key_phrase as text1, 'KEY_PHRASES' as id, 'Key Phrases' as chart_name, 'wordcloud' as chart_type, call_frequency as size1,
        case when avg_sentiment < 1 THEN 'negative' when avg_sentiment between 1 and 2 THEN 'neutral' 
        when avg_sentiment >= 2 THEN 'positive' end as average_sentiment
        from
        (
            select top(100) key_phrase, AVG(sentiment_int) as avg_sentiment, sum(n) as call_frequency 
            from 
            (
                select TRIM(key_phrase) as key_phrase, 1 as n,
                CASE sentiment WHEN 'positive' THEN 3 WHEN 'neutral' THEN 2 WHEN 'negative' THEN 1 end as sentiment_int
                from [dbo].[processed_data_key_phrases]
            ) t
            group by key_phrase
            order by call_frequency desc
        ) t1'''

        cursor.execute(sql_stmt)

        rows = cursor.fetchall()

        column_names = [i[0] for i in cursor.description]
        df = pd.DataFrame(rows, columns=column_names)

        nested_json3 = (
            df.groupby(['id', 'chart_name', 'chart_type']).apply(lambda x: x[['text1', 'size1', 'average_sentiment']].to_dict(orient='records')).reset_index(name='chart_value')
            
        )
        result3 = nested_json3.to_dict(orient='records')

        final_result = result1 + result2 + result3
        json_response = json.dumps(final_result, indent=4)
        # # print(final_json_data)
        
        return func.HttpResponse(json_response, mimetype="application/json", status_code=200)
    
    cursor.close()
    conn.close()

