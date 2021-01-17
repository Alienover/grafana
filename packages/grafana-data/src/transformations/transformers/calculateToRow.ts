import { map } from 'rxjs/operators';
import isEmpty from 'lodash/isEmpty';
import values from 'lodash/values';

import { DataTransformerID } from './ids';
import { DataTransformerInfo } from '../../types/transformations';
import { fieldReducers, reduceField, ReducerID } from '../fieldReducer';
import { getFieldDisplayName } from '../../field/fieldState';
import { DataFrame, Field } from '../../types/dataFrame';
import { ArrayVector } from '../../vector';

export interface CalculateToRowOptions {
  reducers: { [key: string]: ReducerID[] };
}

export const calculateToRowTransformer: DataTransformerInfo<CalculateToRowOptions> = {
  id: DataTransformerID.calculateToRow,
  name: 'Calculate To Row',
  description:
    'Append a new row by calculating each column to a signle value using a function like max, min, mean or last',
  defaultOptions: {
    reducers: {},
  },
  operator: options => source =>
    source.pipe(
      map(data => {
        if (values(options.reducers).every(item => isEmpty(item))) {
          return data;
        }

        return calculateToRow(data, options.reducers);
      })
    ),
};

export function calculateToRow(data: DataFrame[], reducerId: { [key: string]: ReducerID[] }): DataFrame[] {
  const processed: DataFrame[] = [];
  for (const series of data) {
    const fields: Field[] = [];
    for (const [col, field] of series.fields.entries()) {
      const fieldName = getFieldDisplayName(field, series, data);
      if (!fieldName) {
        continue;
      }
      const calculators = fieldReducers.list(reducerId[fieldName] || []);
      const reducers = calculators.map(c => c.id);

      const fieldValueArray = field.values.toArray();
      const statValues = field.config.statValues || [];
      const statValueIndexes = statValues.map(value => value.index.row);
      // Skip the previous calculated values
      const originalFieldValues = new ArrayVector(
        fieldValueArray.filter((_, index) => !statValueIndexes.includes(index))
      );

      const results = reduceField({
        field: {
          ...field,
          values: originalFieldValues,
        },
        reducers,
      });

      if (reducers.length > 0) {
        for (const reducer of reducers) {
          const value = results[reducer];
          const statValue = {
            id: reducer,
            name: fieldReducers.get(reducer).name,
            index: {
              col,
              row: field.values.length,
            },
          };
          const copy = {
            ...field,
            config: {
              ...field.config,
              statValues: [...statValues, statValue],
            },
            values: new ArrayVector([...field.values.toArray(), value]),
          };
          copy.state = undefined;
          fields.push(copy);
        }
      } else {
        const copy = {
          ...field,
          values: new ArrayVector([...field.values.toArray(), undefined]),
        };
        copy.state = undefined;
        fields.push(copy);
      }
    }

    if (fields.length) {
      processed.push({
        ...series,
        fields,
        length: series.length + 1,
      });
    }
  }

  return processed;
}
