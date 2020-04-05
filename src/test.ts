import BinanceAlgorithmTests from "./tests/BinanceStrategiesTests";
import StrategyResult from "./entity/StrategyResult";
import { Trade } from ".";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runBackTestOnProductionAPIAsset('XmaRsiStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1d'
    }, (strategyResult: StrategyResult) => console.log(strategyResult)));

