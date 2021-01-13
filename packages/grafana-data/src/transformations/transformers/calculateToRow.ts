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

        return reduceFields(data, options.reducers);
      })
    ),
};

export function reduceFields(data: DataFrame[], reducerId: { [key: string]: ReducerID[] }): DataFrame[] {
  const processed: DataFrame[] = [];
  for (const series of data) {
    const fields: Field[] = [];
    for (const field of series.fields) {
      const fieldName = getFieldDisplayName(field, series, data);
      if (!fieldName) {
        continue;
      }
      const calculators = fieldReducers.list(reducerId[fieldName] || []);
      const reducers = calculators.map(c => c.id);

      const results = reduceField({
        field,
        reducers,
      });

      if (reducers.length > 0) {
        for (const reducer of reducers) {
          const value = results[reducer];
          const copy = {
            ...field,
            values: new ArrayVector([...field.values.toArray(), value]),
          };
          copy.state = undefined;
          fields.push(copy);
        }
      } else {
        const copy = {
          ...field,
          values: new ArrayVector(field.values.toArray()),
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
