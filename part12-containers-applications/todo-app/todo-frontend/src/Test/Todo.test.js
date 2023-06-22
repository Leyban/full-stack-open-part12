import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import Todo from './../Todos/Todo';


describe('Todo', () => {
    it('should render the component and simulate onClick events', () => {
      const todo = {
        text: 'Sample Todo',
        done: false
      };
      const onClickDelete = jest.fn();
      const onClickComplete = jest.fn();

      const { getByText, getByRole } = render(
        <Todo todo={todo} onClickDelete={onClickDelete} onClickComplete={onClickComplete} />
      );

      // Assert on the rendering of the component
      expect(getByText(todo.text)).toBeInTheDocument();
      expect(getByRole('button', { name: 'Delete' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Set as done' })).toBeInTheDocument();

      // Simulate onClick events
      fireEvent.click(getByRole('button', { name: 'Delete' }));
      fireEvent.click(getByRole('button', { name: 'Set as done' }));

      // Assert on the calls to onClickDelete and onClickComplete
      expect(onClickDelete).toHaveBeenCalledWith(todo);
      expect(onClickComplete).toHaveBeenCalledWith(todo);
    });
  });
  