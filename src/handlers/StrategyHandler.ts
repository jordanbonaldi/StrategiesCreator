import Strategy, {StrategyParams} from "../strategies/Strategy";

export default new class StrategyHandler {

    strategy : Strategy< & StrategyParams >[] = [];

    /**
     *
     * @param strategy
     */
    add(strategy: Strategy<any & StrategyParams>): void {
       this.strategy.push(strategy);
    }

    /**
     *
     * @param name
     */
    getStrategyByName(name: string): Strategy< & StrategyParams> | undefined {
        return this.strategy.filter((strategy: Strategy< & StrategyParams >) => strategy.name === name)[0];
    }

    getAll(): Strategy< & StrategyParams >[] {
        return this.strategy;
    }

    getStrategiesNames(): string[] {
        return this.strategy.map((strategy: Strategy<any>) => strategy.name);
    }

}