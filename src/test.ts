import BinanceAlgorithmTests from "./tests/BinanceStrategiesTests";
import StrategyResult from "./entity/StrategyResult";
import { Trade } from ".";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runBacktestOnAsset('XmaRsiStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1d'
    }).then((trade: any) => console.log(trade)));

