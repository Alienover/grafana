import React, { useMemo } from 'react';

import {
  ReducerID,
  DataTransformerID,
  TransformerUIProps,
  standardTransformers,
  TransformerRegistyItem,
} from '@grafana/data';
import { StatsPicker } from '@grafana/ui';
import { CalculateToRowOptions } from '@grafana/data/src/transformations/transformers/calculateToRow';
import { getAllFieldNamesFromDataFrames } from './OrganizeFieldsTransformerEditor';

export const CalculateToRowTransformerEditor: React.FC<TransformerUIProps<CalculateToRowOptions>> = ({
  input,
  options,
  onChange,
}) => {
  const fieldNames = useMemo(() => getAllFieldNamesFromDataFrames(input), [input]);
  const fieldNameOptions = fieldNames.map((item: string) => ({ label: item, value: item }));

  const reducers = options.reducers || {};

  return (
    <>
      {fieldNameOptions.map(({ label, value }, index) => (
        <div key={index} className="gf-form gf-form--grow">
          <div className="gf-form-label width-8">{label}</div>
          <StatsPicker
            className="flex-grow-1"
            placeholder="Choose Stat"
            stats={reducers[value] || []}
            onChange={stats => {
              onChange({
                ...options,
                reducers: {
                  ...reducers,
                  [value]: stats as ReducerID[],
                },
              });
            }}
          />
        </div>
      ))}
    </>
  );
};

export const calculateToRowTransformRegistryItem: TransformerRegistyItem<CalculateToRowOptions> = {
  id: DataTransformerID.calculateToRow,
  editor: CalculateToRowTransformerEditor,
  transformation: standardTransformers.calculateToRowTransformer,
  name: standardTransformers.calculateToRowTransformer.name,
  description: standardTransformers.calculateToRowTransformer.description,
};
