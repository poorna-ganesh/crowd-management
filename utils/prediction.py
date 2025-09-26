# utils/prediction.py
import pandas as pd
from datetime import datetime, timedelta

# Very simple crowd-forecasting: moving average of last 3 days visitor_count

def load_historical(path):
    df = pd.read_csv(path, parse_dates=['date'])
    return df

def crowd_forecast(historical_df, days=3):
    today = pd.Timestamp.now().normalize()
    recent = historical_df.groupby('date')['visitor_count'].sum().sort_index()
    recent = recent.tail(7)
    avg = recent.mean()

    forecasts = {}
    for i in range(1, days+1):
        d = (today + pd.Timedelta(days=i)).strftime('%Y-%m-%d')
        # naive trend: alternate small random-ish variation using weekday
        weekday = (today + pd.Timedelta(days=i)).weekday()
        factor = 1 + (weekday - 3) * 0.05
        predicted = max(0, int(avg * factor))

        if predicted < avg * 0.8:
            level = 'Green'
        elif predicted < avg * 1.2:
            level = 'Yellow'
        else:
            level = 'Red'

        forecasts[d] = {'predicted_visitors': int(predicted), 'level': level}

    return forecasts


if __name__ == '__main__':
    df = load_historical('data/historical.csv')
    print(crowd_forecast(df, days=5))





