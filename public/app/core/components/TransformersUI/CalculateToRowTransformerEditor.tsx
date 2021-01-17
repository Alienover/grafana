import React, { useMemo, useCallback } from 'react';
import toPairs from 'lodash/toPairs';
import isEmpty from 'lodash/isEmpty';

import {
  ReducerID,
  FieldType,
  SelectableValue,
  DataTransformerID,
  TransformerUIProps,
  getFieldDisplayName,
  standardTransformers,
  TransformerRegistyItem,
  DataFrame,
} from '@grafana/data';
import { StatsPicker, Button, Select } from '@grafana/ui';
import {
  CalculateToRowOptions,
  RowPlacement,
  rowPlacements,
} from '@grafana/data/src/transformations/transformers/calculateToRow';
import { getAllFieldNamesFromDataFrames } from './OrganizeFieldsTransformerEditor';

export const CalculateToRowTransformerEditor: React.FC<TransformerUIProps<CalculateToRowOptions>> = ({
  input,
  options,
  onChange,
}) => {
  const fieldNames = useMemo(() => getAllFieldNamesFromDataFrames(input), [input]);
  const fieldTypes = useMemo(() => getFieldTypesFromDataFrame(input), [input]);
  const fieldNameOptions = fieldNames.map((name: string) => ({ label: name, value: name, type: fieldTypes[name] }));

  const placement = options.placement || RowPlacement.bottom;
  const reducers = options.reducers || {};
  const unselected = fieldNames.filter(name => !(name in reducers));

  const onAddField = useCallback(() => {
    const unselectedOptions = fieldNameOptions.filter(option => !(option.value in reducers));
    let option =
      unselectedOptions.find(option => option.type !== FieldType.time) ||
      unselectedOptions.find(option => option.type === FieldType.time);

    if (!option) {
      return;
    }

    onChange({
      ...options,
      reducers: {
        ...reducers,
        [option.value]: [] as ReducerID[],
      },
    });
  }, [options, onChange, input, reducers, fieldNameOptions]);

  const onChangeField = useCallback(
    (selectable: SelectableValue<string>, prevField: string) => {
      if (!selectable?.value) {
        return;
      }

      const { [prevField]: _, ...next } = reducers;

      onChange({
        ...options,
        reducers: {
          ...next,
          [selectable.value]: reducers[prevField],
        },
      });
    },
    [options, onChange, input, reducers]
  );

  const onChangePlacement = useCallback(
    (selectable?: SelectableValue<RowPlacement>) => {
      if (!selectable?.value) {
        return;
      }

      onChange({
        ...options,
        placement: selectable.value,
      });
    },
    [options, onChange, input, placement]
  );

  const onDelete = useCallback(
    field => {
      const { [field]: _, ...next } = reducers;

      onChange({
        ...options,
        reducers: { ...next },
        placement: isEmpty(next) ? RowPlacement.bottom : placement,
      });
    },
    [options, onChange, reducers]
  );

  return (
    <>
      <div className="gf-form gf-form-spacing">
        <div className="gf-form-label width-7">Place at</div>
        <Select
          className="width-15"
          placeholder="(Default to bottom)"
          options={rowPlacements}
          value={placement}
          onChange={onChangePlacement}
        />
      </div>
      {toPairs(reducers).map(([field, stats], index) => (
        <div key={index} className="gf-form-inline">
          <div className="gf-form gf-form-spacing">
            <div className="gf-form-label width-7">Field</div>
            <Select
              className="min-width-15 max-width-24"
              placeholder="Field Name"
              options={fieldNameOptions.filter(option => option.value === field || !(option.value in reducers))}
              value={field}
              onChange={(selectable: any) => onChangeField(selectable as SelectableValue<string>, field)}
            />
          </div>
          <div className="gf-form gf-form-spacing">
            <div className="gf-form-label width-7">Stat</div>
            <StatsPicker
              className="min-width-15 max-width-24"
              placeholder="Choose Stat"
              stats={stats}
              onChange={vals => {
                onChange({
                  ...options,
                  reducers: {
                    ...reducers,
                    [field]: vals as ReducerID[],
                  },
                });
              }}
            />
          </div>
          <div className="gf-form">
            <Button icon="times" onClick={() => onDelete(field)} variant="secondary" />
          </div>
        </div>
      ))}
      {unselected.length > 0 && (
        <div className="gf-form">
          <Button icon="plus" size="sm" onClick={onAddField} variant="secondary">
            Add feild to calculate
          </Button>
        </div>
      )}
    </>
  );
};

function getFieldTypesFromDataFrame(data: DataFrame[]): { [key: string]: FieldType } {
  return data.reduce((types, frame) => {
    if (!frame || !Array.isArray(frame.fields)) {
      return types;
    }

    return frame.fields.reduce((types, field) => {
      const t = getFieldDisplayName(field, frame, data);

      types[t] = field.type;
      return types;
    }, types);
  }, {} as { [key: string]: FieldType });
}

export const calculateToRowTransformRegistryItem: TransformerRegistyItem<CalculateToRowOptions> = {
  id: DataTransformerID.calculateToRow,
  editor: CalculateToRowTransformerEditor,
  transformation: standardTransformers.calculateToRowTransformer,
  name: standardTransformers.calculateToRowTransformer.name,
  description: standardTransformers.calculateToRowTransformer.description,
};
