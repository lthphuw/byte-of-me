import Loading from '@/shared/ui/loading';

export default function HomeLoading() {
  return (
    <div className="fixed inset-0 pl-[256px] flex items-center justify-center">
      <Loading size={45} />
    </div>
  );
}
