import BinanceAlgorithmTests from "./tests/BinanceStrategiesTests";
import StrategyResult from "./entity/StrategyResult";
import { Trade } from ".";

BinanceAlgorithmTests.connect()
    .then(instance => instance.runBootstrapStrategyOnProductionAPIAsset('XmaRsiStrategy', {
        asset: 'BTCUSDT',
        timeframe: '1d'
    }, (trade: Trade) => console.log(trade)));

