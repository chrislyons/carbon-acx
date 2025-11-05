import { useRouteError } from 'react-router-dom';

interface ErrorViewProps {
  title?: string;
}

export default function ErrorView({ title }: ErrorViewProps) {
  const error = useRouteError();
  let message = 'Something went wrong.';
  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === 'object' && 'statusText' in error) {
    message = String((error as { statusText?: string }).statusText ?? message);
  }

  return (
    <div className="error-view">
      <h1>{title ?? 'Error'}</h1>
      <p>{message}</p>
    </div>
  );
}
