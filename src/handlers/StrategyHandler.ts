import Strategy, {Persistence, StrategyParams} from "../strategies/Strategy";

export default new class StrategyHandler {

    strategy : Strategy< & StrategyParams, & Persistence >[] = [];

    /**
     *
     * @param strategy
     */
    add(strategy: Strategy<any & StrategyParams, any & Persistence>): void {
       this.strategy.push(strategy);
    }

    /**
     *
     * @param name
     */
    getStrategyByName(name: string): Strategy< & StrategyParams, & Persistence> | undefined {
        return this.strategy.filter((strategy: Strategy< & StrategyParams, & Persistence >) => strategy.name === name)[0];
    }

    getAll(): Strategy< & StrategyParams , & Persistence>[] {
        return this.strategy;
    }

    getStrategiesNames(): string[] {
        return this.strategy.map((strategy: Strategy<& StrategyParams, & Persistence>) => strategy.name);
    }

}