import Strategy, {StrategyParams} from "../strategies/Strategy";

export interface PersistenceAllowanceInterface<T, U> {
    params: T & StrategyParams;
    data: U | undefined;
}

export default new class PersistenceManager {

    private persistences : Map<String, PersistenceAllowanceInterface<any, any>[]> = new Map<String, PersistenceAllowanceInterface<any, any>[]>();

    getPersistenceFromPersistenceAllowanceInterfaceArray<T, U>(strategy: Strategy<T, U>, pais: PersistenceAllowanceInterface<T, U>[]): PersistenceAllowanceInterface<T, U> | undefined {
        return pais.filter((pai: PersistenceAllowanceInterface<T, U>) => pai.params == strategy.defaultParams)[0];
    }

    getPersistences<T, U>(strategy: Strategy<T, U>): PersistenceAllowanceInterface<T, U>[] | undefined {
        let pais: PersistenceAllowanceInterface<T, U>[] | undefined = this.persistences.get(strategy.name);

        if (pais == undefined)
            return undefined;

        return pais;
    }
    
    getPersistence<T, U>(strategy: Strategy<T, U>): PersistenceAllowanceInterface<T, U> | undefined {
        let pais: PersistenceAllowanceInterface<T, U>[] | undefined = this.getPersistences(strategy);

        return pais == undefined ? undefined : this.getPersistenceFromPersistenceAllowanceInterfaceArray<T, U>(strategy, pais);
    }

    setPersistence<T, U>(strategy: Strategy<T, U>) {
        let pais: PersistenceAllowanceInterface<T, U>[] | undefined = this.getPersistences<T, U>(strategy);
        
        if (pais != null) {
            let _pai: PersistenceAllowanceInterface<T, U> | undefined = this.getPersistenceFromPersistenceAllowanceInterfaceArray<T, U>(strategy, pais);
            return _pai == null ? pais.push({
                data: strategy.data as U | undefined, params: strategy.defaultParams
            }) : _pai.data = strategy.data;
        }

        this.persistences.set(strategy.name, [{
            params: strategy.defaultParams as (T & StrategyParams),
            data: strategy.data as U
        }]);
    }

}