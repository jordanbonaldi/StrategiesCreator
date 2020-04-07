import Strategy from "../strategies/Strategy";

export interface PersistenceAllowanceInterface {
    params: any;
    data: any;
}

export default new class PersistenceManager {

    private persistences : Map<String, PersistenceAllowanceInterface[]> = new Map<String, PersistenceAllowanceInterface[]>();

    getPersistenceFromPersistenceAllowanceInterfaceArray<T>(strategy: Strategy<T>, pais: PersistenceAllowanceInterface[]): PersistenceAllowanceInterface | undefined {
        return pais.filter((pai: PersistenceAllowanceInterface) => pai.params == strategy.defaultParams)[0];
    }

    getPersistences<T>(strategy: Strategy<T>): PersistenceAllowanceInterface[] | undefined {
        let pais: PersistenceAllowanceInterface[] | undefined = this.persistences.get(strategy.name);

        if (pais == undefined)
            return undefined;

        return pais;
    }
    
    getPersistence<T>(strategy: Strategy<T>): PersistenceAllowanceInterface | undefined {
        let pais: PersistenceAllowanceInterface[] | undefined = this.getPersistences(strategy);

        return pais == undefined ? undefined : this.getPersistenceFromPersistenceAllowanceInterfaceArray(strategy, pais);
    }

    setPersistence<T>(strategy: Strategy<T>) {
        let pais: PersistenceAllowanceInterface[] | undefined = this.getPersistences<T>(strategy);
        
        if (pais != null) {
            let _pai: PersistenceAllowanceInterface | undefined = this.getPersistenceFromPersistenceAllowanceInterfaceArray(strategy, pais);
            return _pai == null ? pais.push({
                data: strategy.data, params: strategy.defaultParams
            }) : _pai.data = strategy.data;
        }

        this.persistences.set(strategy.name, [{
            params: strategy.defaultParams,
            data: strategy.data
        }]);
    }

}